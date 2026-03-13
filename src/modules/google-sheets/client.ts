import env from "#config/env/env.js";
import { google, sheets_v4 } from "googleapis";

const GOOGLE_SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const DEFAULT_SHEET_NAME = "stocks_coefs";

export class GoogleSheetsClientError extends Error {
    public readonly cause: unknown;

    constructor(message: string, options: { cause?: unknown } = {}) {
        super(message);
        this.name = "GoogleSheetsClientError";
        this.cause = options.cause;
    }
}

export type SpreadsheetMetadata = sheets_v4.Schema$Spreadsheet;

export type GoogleSheetsClient = {
    getSpreadsheetMetadata: (spreadsheetId: string) => Promise<SpreadsheetMetadata>;
    hasSheet: (spreadsheetId: string, sheetName?: string) => Promise<boolean>;
    ensureSheet: (spreadsheetId: string, sheetName?: string) => Promise<void>;
    clearRange: (spreadsheetId: string, range?: string) => Promise<void>;
    writeRangeValues: (
        spreadsheetId: string,
        values: Array<Array<string | number | null>>,
        range?: string,
    ) => Promise<void>;
};

function normalizePrivateKey(privateKey: string): string {
    return privateKey.replace(/\\n/g, "\n").trim();
}

function createSheetsApi(): sheets_v4.Sheets {
    const auth = new google.auth.JWT({
        email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        key: normalizePrivateKey(env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY),
        scopes: [GOOGLE_SHEETS_SCOPE],
    });

    return google.sheets({
        version: "v4",
        auth,
    });
}

function toSheetRange(sheetName: string, range?: string): string {
    if (!range || range.trim() === "") {
        return sheetName;
    }

    return `${sheetName}!${range}`;
}

function getSheetTitle(sheet: sheets_v4.Schema$Sheet | undefined): string | undefined {
    return sheet?.properties?.title ?? undefined;
}

export function createGoogleSheetsClient(
    dependencies: {
        sheetsApi?: sheets_v4.Sheets;
        defaultSheetName?: string;
    } = {},
): GoogleSheetsClient {
    const sheetsApi = dependencies.sheetsApi ?? createSheetsApi();
    const defaultSheetName = dependencies.defaultSheetName ?? DEFAULT_SHEET_NAME;

    const getSpreadsheetMetadata = async (spreadsheetId: string): Promise<SpreadsheetMetadata> => {
        try {
            const response = await sheetsApi.spreadsheets.get({
                spreadsheetId,
                fields: "spreadsheetId,properties.title,sheets.properties",
            });

            return response.data;
        } catch (error) {
            throw new GoogleSheetsClientError(`Failed to load spreadsheet metadata for "${spreadsheetId}"`, {
                cause: error,
            });
        }
    };

    const hasSheet = async (spreadsheetId: string, sheetName = defaultSheetName): Promise<boolean> => {
        const metadata = await getSpreadsheetMetadata(spreadsheetId);

        return (metadata.sheets ?? []).some((sheet) => getSheetTitle(sheet) === sheetName);
    };

    const ensureSheet = async (spreadsheetId: string, sheetName = defaultSheetName): Promise<void> => {
        if (await hasSheet(spreadsheetId, sheetName)) {
            return;
        }

        try {
            await sheetsApi.spreadsheets.batchUpdate({
                spreadsheetId,
                requestBody: {
                    requests: [
                        {
                            addSheet: {
                                properties: {
                                    title: sheetName,
                                },
                            },
                        },
                    ],
                },
            });
        } catch (error) {
            throw new GoogleSheetsClientError(
                `Failed to create sheet "${sheetName}" in "${spreadsheetId}"`,
                { cause: error },
            );
        }
    };

    return {
        getSpreadsheetMetadata,
        hasSheet,
        ensureSheet,

        clearRange: async (spreadsheetId, range = toSheetRange(defaultSheetName)) => {
            try {
                await sheetsApi.spreadsheets.values.clear({
                    spreadsheetId,
                    range,
                });
            } catch (error) {
                throw new GoogleSheetsClientError(`Failed to clear range "${range}" in "${spreadsheetId}"`, {
                    cause: error,
                });
            }
        },

        writeRangeValues: async (spreadsheetId, values, range = toSheetRange(defaultSheetName, "A1")) => {
            try {
                await sheetsApi.spreadsheets.values.update({
                    spreadsheetId,
                    range,
                    valueInputOption: "USER_ENTERED",
                    requestBody: {
                        values,
                    },
                });
            } catch (error) {
                throw new GoogleSheetsClientError(
                    `Failed to write range "${range}" in "${spreadsheetId}"`,
                    { cause: error },
                );
            }
        },
    };
}
