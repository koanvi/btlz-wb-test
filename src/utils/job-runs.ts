import knex from "#postgres/knex.js";
import type { Knex } from "knex";

type DbExecutor = Knex | Knex.Transaction;

type JobRunDetails = Record<string, unknown>;

type JobRunTableRow = {
    id: number | string;
    job_name: string;
    status: JobRunStatus;
    started_at: Date;
    finished_at: Date | null;
    details: JobRunDetails | null;
    error_text: string | null;
};

type JobRunRow = {
    id: number | string;
};

export type JobRunStatus = "running" | "success" | "error";

export type JobRunsRepository = {
    start: (data: {
        jobName: string;
        startedAt: Date;
        details?: JobRunDetails;
    }) => Promise<number>;
    finishSuccess: (data: {
        jobRunId: number;
        finishedAt: Date;
        details?: JobRunDetails;
    }) => Promise<void>;
    finishError: (data: {
        jobRunId: number;
        finishedAt: Date;
        details?: JobRunDetails;
        error: unknown;
    }) => Promise<void>;
};

function toJobRunId(value: number | string): number {
    return typeof value === "number" ? value : Number(value);
}

function toErrorText(error: unknown): string {
    if (error instanceof Error) {
        return error.stack ?? error.message;
    }

    return String(error);
}

export function createJobRunsRepository(db: DbExecutor = knex): JobRunsRepository {
    return {
        start: async ({ jobName, startedAt, details }) => {
            const [row] = await db<JobRunTableRow>("job_runs")
                .insert({
                    job_name: jobName,
                    status: "running",
                    started_at: startedAt,
                    finished_at: null,
                    details: details ?? null,
                    error_text: null,
                })
                .returning("id");

            return toJobRunId(row.id);
        },

        finishSuccess: async ({ jobRunId, finishedAt, details }) => {
            await db("job_runs")
                .where({ id: jobRunId })
                .update({
                    status: "success",
                    finished_at: finishedAt,
                    details: details ?? null,
                    error_text: null,
                });
        },

        finishError: async ({ jobRunId, finishedAt, details, error }) => {
            await db("job_runs")
                .where({ id: jobRunId })
                .update({
                    status: "error",
                    finished_at: finishedAt,
                    details: details ?? null,
                    error_text: toErrorText(error),
                });
        },
    };
}
