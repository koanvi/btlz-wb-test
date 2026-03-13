export function getCurrentDateYmd(date = new Date()): string {
    return date.toISOString().slice(0, 10);
}

export function toNullableString(value: unknown): string | null {
    if (typeof value !== "string") {
        return null;
    }

    const normalized = value.trim();
    return normalized === "" ? null : normalized;
}

export function parseWbNumber(value: string | null | undefined): number | null {
    const normalized = toNullableString(value);

    if (normalized === null) {
        return null;
    }

    const parsed = Number(normalized.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
}

export function toErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    return String(error);
}

export async function sleep(ms: number): Promise<void> {
    await new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

export async function retry<T>(
    operation: () => Promise<T>,
    options: {
        retries?: number;
        delayMs?: number;
        shouldRetry?: (error: unknown) => boolean;
    } = {},
): Promise<T> {
    const retries = options.retries ?? 3;
    const delayMs = options.delayMs ?? 0;
    const shouldRetry = options.shouldRetry ?? (() => true);

    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;

            if (attempt === retries || !shouldRetry(error)) {
                break;
            }

            if (delayMs > 0) {
                await sleep(delayMs);
            }
        }
    }

    throw lastError;
}
