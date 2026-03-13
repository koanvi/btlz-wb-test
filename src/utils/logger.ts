type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

function getPrefix(level: LogLevel): string {
    return `[${new Date().toISOString()}] [${level}]`;
}

function normalizeLogArgument(value: unknown): unknown {
    if (value instanceof Error) {
        return value.stack ?? value.message;
    }

    return value;
}

function writeLog(level: LogLevel, args: unknown[]): void {
    const normalizedArgs = args.map(normalizeLogArgument);

    if (level === "ERROR") {
        console.error(getPrefix(level), ...normalizedArgs);
        return;
    }

    if (level === "WARN") {
        console.warn(getPrefix(level), ...normalizedArgs);
        return;
    }

    if (level === "DEBUG") {
        console.debug(getPrefix(level), ...normalizedArgs);
        return;
    }

    console.info(getPrefix(level), ...normalizedArgs);
}

export const logger = {
    info: (...args: unknown[]) => {
        writeLog("INFO", args);
    },
    warn: (...args: unknown[]) => {
        writeLog("WARN", args);
    },
    error: (...args: unknown[]) => {
        writeLog("ERROR", args);
    },
    debug: (...args: unknown[]) => {
        writeLog("DEBUG", args);
    },
};
