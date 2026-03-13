export { createGoogleSheetsClient, GoogleSheetsClientError } from "#modules/google-sheets/client.js";

export type GoogleSheetsModule = {
    updateRows: (rows: Record<string, unknown>[]) => Promise<void>;
};

export function createGoogleSheetsModule(): GoogleSheetsModule {
    return {
        updateRows: async (_rows) => {},
    };
}
