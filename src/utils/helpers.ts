export function seconds(value: number): number {
    return value * 1000;
}

export function toErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    return String(error);
}

export function noop(): void {}
