import { logger } from "#utils/logger.js";

export type SchedulerTask = {
    name: string;
    intervalMs: number;
    run: () => Promise<void> | void;
    immediate?: boolean;
};

export type Scheduler = {
    start: () => void;
    stop: () => void;
};

export function createScheduler(task: SchedulerTask): Scheduler {
    let timer: NodeJS.Timeout | undefined;
    let isRunning = false;

    const execute = async () => {
        if (isRunning) {
            logger.warn(`Task "${task.name}" is still running. Skip current tick`);
            return;
        }

        isRunning = true;

        try {
            await task.run();
        } catch (error) {
            logger.error(`Task "${task.name}" failed`, error);
        } finally {
            isRunning = false;
        }
    };

    return {
        start: () => {
            if (timer) {
                return;
            }

            if (task.immediate) {
                void execute();
            }

            timer = setInterval(() => {
                void execute();
            }, task.intervalMs);

            logger.info(`Task "${task.name}" scheduled every ${task.intervalMs} ms`);
        },
        stop: () => {
            if (!timer) {
                return;
            }

            clearInterval(timer);
            timer = undefined;
            logger.info(`Task "${task.name}" stopped`);
        },
    };
}
