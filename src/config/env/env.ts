import dotenv from "dotenv";
import { z } from "zod";
dotenv.config();

function parseSpreadsheetIds(value: string | undefined): string[] {
    if (!value) {
        return [];
    }

    return value
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item !== "");
}

function uniqueValues<T>(values: T[]): T[] {
    return [...new Set(values)];
}

function normalizeOptionalString(value: string | undefined): string | undefined {
    const normalized = value?.trim();
    return normalized ? normalized : undefined;
}

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
    if (value === undefined) {
        return defaultValue;
    }

    return value === "true";
}

const envSchema = z.object({
    NODE_ENV: z.union([z.undefined(), z.enum(["development", "production"])]),
    POSTGRES_HOST: z.union([z.undefined(), z.string()]),
    POSTGRES_PORT: z
        .string()
        .regex(/^[0-9]+$/)
        .transform((value) => parseInt(value)),
    POSTGRES_DB: z.string(),
    POSTGRES_USER: z.string(),
    POSTGRES_PASSWORD: z.string(),
    WB_API_TOKEN: z.string(),
    GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string(),
    GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: z.string(),
    GOOGLE_SPREADSHEET_IDS: z.union([z.undefined(), z.string()]),
    GOOGLE_SPREADSHEET_SHEET_NAME: z.union([z.undefined(), z.string()]),
    WB_TARIFFS_SYNC_CRON: z.string(),
    WB_TARIFFS_SYNC_RUN_ON_START: z.union([z.undefined(), z.enum(["true", "false"])]),
    GOOGLE_SHEETS_SYNC_CRON: z.string(),
    GOOGLE_SHEETS_SYNC_RUN_ON_START: z.union([z.undefined(), z.enum(["true", "false"])]),
});

const parsedEnv = envSchema.parse({
    POSTGRES_HOST: process.env.POSTGRES_HOST,
    POSTGRES_PORT: process.env.POSTGRES_PORT,
    POSTGRES_DB: process.env.POSTGRES_DB,
    POSTGRES_USER: process.env.POSTGRES_USER,
    POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD,
    NODE_ENV: process.env.NODE_ENV,
    WB_API_TOKEN: process.env.WB_API_TOKEN,
    GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
    GOOGLE_SPREADSHEET_IDS: process.env.GOOGLE_SPREADSHEET_IDS,
    GOOGLE_SPREADSHEET_SHEET_NAME: process.env.GOOGLE_SPREADSHEET_SHEET_NAME,
    WB_TARIFFS_SYNC_CRON: process.env.WB_TARIFFS_SYNC_CRON,
    WB_TARIFFS_SYNC_RUN_ON_START: process.env.WB_TARIFFS_SYNC_RUN_ON_START,
    GOOGLE_SHEETS_SYNC_CRON: process.env.GOOGLE_SHEETS_SYNC_CRON,
    GOOGLE_SHEETS_SYNC_RUN_ON_START: process.env.GOOGLE_SHEETS_SYNC_RUN_ON_START,
});

const wbTariffsSyncCron = normalizeOptionalString(parsedEnv.WB_TARIFFS_SYNC_CRON);
const googleSheetsSyncCron = normalizeOptionalString(parsedEnv.GOOGLE_SHEETS_SYNC_CRON);

const env = {
    ...parsedEnv,
    GOOGLE_SPREADSHEET_IDS: uniqueValues(parseSpreadsheetIds(parsedEnv.GOOGLE_SPREADSHEET_IDS)),
    GOOGLE_SPREADSHEET_SHEET_NAME:
        parsedEnv.GOOGLE_SPREADSHEET_SHEET_NAME?.trim() || "stocks_coefs",
    WB_TARIFFS_SYNC_CRON: wbTariffsSyncCron ?? "0 * * * *",
    WB_TARIFFS_SYNC_RUN_ON_START: parseBoolean(parsedEnv.WB_TARIFFS_SYNC_RUN_ON_START, true),
    GOOGLE_SHEETS_SYNC_CRON: googleSheetsSyncCron ?? "*/15 * * * *",
    GOOGLE_SHEETS_SYNC_RUN_ON_START: parseBoolean(parsedEnv.GOOGLE_SHEETS_SYNC_RUN_ON_START, true),
};

export default env;
