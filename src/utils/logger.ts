type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

function getPrefix(level: LogLevel): string {
    return `[${new Date().toISOString()}] [${level}]`;
}

export const logger = {
    info: (...args: unknown[]) => {
        console.info(getPrefix("INFO"), ...args);
    },
    warn: (...args: unknown[]) => {
        console.warn(getPrefix("WARN"), ...args);
    },
    error: (...args: unknown[]) => {
        console.error(getPrefix("ERROR"), ...args);
    },
    debug: (...args: unknown[]) => {
        console.debug(getPrefix("DEBUG"), ...args);
    },
};
