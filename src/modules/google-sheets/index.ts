import { createGoogleSheetsService } from "#modules/google-sheets/service.js";

export { createGoogleSheetsClient, GoogleSheetsClientError } from "#modules/google-sheets/client.js";
export { createGoogleSheetsRepository } from "#modules/google-sheets/repository.js";
export { createGoogleSheetsService } from "#modules/google-sheets/service.js";

export type GoogleSheetsModule = {
    updateRows: (rows: Record<string, unknown>[]) => Promise<void>;
};

export function createGoogleSheetsModule(): GoogleSheetsModule {
    const service = createGoogleSheetsService();

    return {
        updateRows: async (_rows) => {
            await service.syncCurrentTariffs();
        },
    };
}
