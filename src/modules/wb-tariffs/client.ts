import env from "#config/env/env.js";
import { retry, toErrorMessage } from "#utils/helpers.js";
import type { WbTariffsApiResponse } from "#modules/wb-tariffs/types.js";

const WB_TARIFFS_API_BASE_URL = "https://common-api.wildberries.ru";

export class WbTariffsClientError extends Error {
    public readonly status: number | null;

    public readonly isRetryable: boolean;

    constructor(message: string, options: { status?: number | null; isRetryable?: boolean } = {}) {
        super(message);
        this.name = "WbTariffsClientError";
        this.status = options.status ?? null;
        this.isRetryable = options.isRetryable ?? false;
    }
}

export type WbTariffsClient = {
    getBoxTariffs: (date: string) => Promise<WbTariffsApiResponse>;
};

function isRetryableStatus(status: number): boolean {
    return status === 429 || status >= 500;
}

function assertWbTariffsApiResponse(payload: unknown): asserts payload is WbTariffsApiResponse {
    if (
        typeof payload !== "object" ||
        payload === null ||
        !("response" in payload) ||
        typeof payload.response !== "object" ||
        payload.response === null ||
        !("data" in payload.response)
    ) {
        throw new WbTariffsClientError("WB API returned unexpected payload format");
    }
}

async function requestBoxTariffs(date: string): Promise<WbTariffsApiResponse> {
    const url = new URL("/api/v1/tariffs/box", WB_TARIFFS_API_BASE_URL);
    url.searchParams.set("date", date);

    let response: Response;

    try {
        response = await fetch(url, {
            method: "GET",
            headers: {
                Authorization: env.WB_API_TOKEN,
                Accept: "application/json",
            },
        });
    } catch (error) {
        throw new WbTariffsClientError(`WB API request failed: ${toErrorMessage(error)}`, {
            isRetryable: true,
        });
    }

    if (!response.ok) {
        throw new WbTariffsClientError(`WB API request failed with status ${response.status}`, {
            status: response.status,
            isRetryable: isRetryableStatus(response.status),
        });
    }

    let payload: unknown;

    try {
        payload = await response.json();
    } catch (error) {
        throw new WbTariffsClientError(`WB API returned invalid JSON: ${toErrorMessage(error)}`);
    }

    assertWbTariffsApiResponse(payload);
    return payload;
}

export function createWbTariffsClient(): WbTariffsClient {
    return {
        getBoxTariffs: async (date) => {
            return retry(
                async () => requestBoxTariffs(date),
                {
                    retries: 3,
                    delayMs: 1000,
                    shouldRetry: (error) => {
                        return error instanceof WbTariffsClientError && error.isRetryable;
                    },
                },
            );
        },
    };
}
