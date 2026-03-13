import { createJobRunsRepository } from "#utils/job-runs.js";
import { logger } from "#utils/logger.js";

type CronField = {
    wildcard: boolean;
    allowedValues: Set<number>;
};

type ParsedCronExpression = {
    minute: CronField;
    hour: CronField;
    dayOfMonth: CronField;
    month: CronField;
    dayOfWeek: CronField;
};

export type SchedulerTask = {
    name: string;
    run: () => Promise<void> | void;
    cron: string;
    runOnStart?: boolean;
};

export type Scheduler = {
    start: () => void;
    stop: () => void;
};

type SchedulerRuntimeTask = {
    config: SchedulerTask;
    parsedCron?: ParsedCronExpression;
    timer?: NodeJS.Timeout;
    isRunning: boolean;
};

type SchedulerTrigger = "startup" | "schedule";

function createRange(start: number, end: number, step = 1): number[] {
    const values: number[] = [];

    for (let current = start; current <= end; current += step) {
        values.push(current);
    }

    return values;
}

function parseCronPart(part: string, min: number, max: number): number[] {
    const [rawRange, rawStep] = part.split("/");
    const step = rawStep ? Number(rawStep) : 1;

    if (!Number.isInteger(step) || step <= 0) {
        throw new Error(`Invalid cron step "${part}"`);
    }

    if (rawRange === "*") {
        return createRange(min, max, step);
    }

    if (rawRange.includes("-")) {
        const [rawStart, rawEnd] = rawRange.split("-");
        const start = Number(rawStart);
        const end = Number(rawEnd);

        if (!Number.isInteger(start) || !Number.isInteger(end) || start > end) {
            throw new Error(`Invalid cron range "${part}"`);
        }

        if (start < min || end > max) {
            throw new Error(`Cron range "${part}" is out of bounds`);
        }

        return createRange(start, end, step);
    }

    const value = Number(rawRange);

    if (!Number.isInteger(value) || value < min || value > max) {
        throw new Error(`Invalid cron value "${part}"`);
    }

    return [value];
}

function parseCronField(field: string, min: number, max: number): CronField {
    if (field === "*") {
        return {
            wildcard: true,
            allowedValues: new Set(createRange(min, max)),
        };
    }

    const allowedValues = new Set<number>();

    for (const part of field.split(",")) {
        for (const value of parseCronPart(part.trim(), min, max)) {
            allowedValues.add(value);
        }
    }

    return {
        wildcard: false,
        allowedValues,
    };
}

function parseCronExpression(expression: string): ParsedCronExpression {
    const parts = expression.trim().split(/\s+/);

    if (parts.length !== 5) {
        throw new Error(`Cron expression "${expression}" must contain 5 fields`);
    }

    return {
        minute: parseCronField(parts[0], 0, 59),
        hour: parseCronField(parts[1], 0, 23),
        dayOfMonth: parseCronField(parts[2], 1, 31),
        month: parseCronField(parts[3], 1, 12),
        dayOfWeek: parseCronField(parts[4], 0, 6),
    };
}

function matchesField(field: CronField, value: number): boolean {
    return field.allowedValues.has(value);
}

function matchesCron(parsedCron: ParsedCronExpression, date: Date): boolean {
    return (
        matchesField(parsedCron.minute, date.getMinutes()) &&
        matchesField(parsedCron.hour, date.getHours()) &&
        matchesField(parsedCron.dayOfMonth, date.getDate()) &&
        matchesField(parsedCron.month, date.getMonth() + 1) &&
        matchesField(parsedCron.dayOfWeek, date.getDay())
    );
}

function getNextCronDelayMs(parsedCron: ParsedCronExpression, from = new Date()): number {
    const candidate = new Date(from);
    candidate.setSeconds(0, 0);
    candidate.setMinutes(candidate.getMinutes() + 1);

    for (let attempt = 0; attempt < 366 * 24 * 60; attempt += 1) {
        if (matchesCron(parsedCron, candidate)) {
            return Math.max(candidate.getTime() - from.getTime(), 1000);
        }

        candidate.setMinutes(candidate.getMinutes() + 1);
    }

    throw new Error("Unable to calculate next run time from cron expression");
}

function validateTask(task: SchedulerTask): void {
    if (!task.cron.trim()) {
        throw new Error(`Task "${task.name}" must define cron expression`);
    }
}

function getScheduleLabel(task: SchedulerRuntimeTask): string {
    return `cron "${task.config.cron}"`;
}

export function createScheduler(tasks: SchedulerTask[]): Scheduler {
    const jobRunsRepository = createJobRunsRepository();
    const runtimeTasks = tasks.map<SchedulerRuntimeTask>((task) => {
        validateTask(task);

        return {
            config: task,
            parsedCron: parseCronExpression(task.cron),
            isRunning: false,
        };
    });

    let isStarted = false;

    const executeTask = async (task: SchedulerRuntimeTask, trigger: SchedulerTrigger) => {
        if (task.isRunning) {
            logger.warn(`Task "${task.config.name}" is still running. Skip current tick`);
            return;
        }

        task.isRunning = true;
        const startedAt = new Date();
        const baseDetails = {
            trigger,
            cron: task.config.cron,
        };
        let jobRunId: number | null = null;

        try {
            logger.info(`Task "${task.config.name}" started`, baseDetails);

            try {
                jobRunId = await jobRunsRepository.start({
                    jobName: task.config.name,
                    startedAt,
                    details: baseDetails,
                });
            } catch (error) {
                logger.error(`Failed to write running job_run for "${task.config.name}"`, error);
            }

            await task.config.run();
            const finishedAt = new Date();
            const successDetails = {
                ...baseDetails,
                duration_ms: finishedAt.getTime() - startedAt.getTime(),
            };

            logger.info(`Task "${task.config.name}" completed`, successDetails);

            if (jobRunId !== null) {
                try {
                    await jobRunsRepository.finishSuccess({
                        jobRunId,
                        finishedAt,
                        details: successDetails,
                    });
                } catch (error) {
                    logger.error(`Failed to write successful job_run for "${task.config.name}"`, error);
                }
            }
        } catch (error) {
            const finishedAt = new Date();
            const errorDetails = {
                ...baseDetails,
                duration_ms: finishedAt.getTime() - startedAt.getTime(),
            };

            logger.error(`Task "${task.config.name}" failed`, error);

            if (jobRunId !== null) {
                try {
                    await jobRunsRepository.finishError({
                        jobRunId,
                        finishedAt,
                        details: errorDetails,
                        error,
                    });
                } catch (jobRunError) {
                    logger.error(`Failed to write failed job_run for "${task.config.name}"`, jobRunError);
                }
            }
        } finally {
            task.isRunning = false;
        }
    };

    const scheduleNextRun = (task: SchedulerRuntimeTask) => {
        if (!isStarted) {
            return;
        }

        const delayMs = getNextCronDelayMs(task.parsedCron!);

        task.timer = setTimeout(() => {
            task.timer = undefined;
            void executeTask(task, "schedule");
            scheduleNextRun(task);
        }, delayMs);
    };

    return {
        start: () => {
            if (isStarted) {
                return;
            }

            isStarted = true;

            for (const task of runtimeTasks) {
                if (task.config.runOnStart ?? true) {
                    void executeTask(task, "startup");
                }

                scheduleNextRun(task);
                logger.info(`Task "${task.config.name}" scheduled ${getScheduleLabel(task)}`);
            }
        },
        stop: () => {
            if (!isStarted) {
                return;
            }

            isStarted = false;

            for (const task of runtimeTasks) {
                if (task.timer) {
                    clearTimeout(task.timer);
                    task.timer = undefined;
                }

                logger.info(`Task "${task.config.name}" stopped`);
            }
        },
    };
}
