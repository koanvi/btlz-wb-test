import { createGoogleSheetsClient, type GoogleSheetsClient } from "#modules/google-sheets/client.js";
import {
    createGoogleSheetsRepository,
    type GoogleSheetsRepository,
    type GoogleSheetsTariffExportRow,
} from "#modules/google-sheets/repository.js";

const DEFAULT_SHEET_NAME = "stocks_coefs";
const DEFAULT_WRITE_RANGE = "A1";

const SHEET_HEADERS = [
    "tariff_date",
    "dt_next_box",
    "dt_till_max",
    "last_fetched_at",
    "warehouse_name",
    "geo_name",
    "box_delivery_base",
    "box_delivery_coef_expr",
    "box_delivery_liter",
    "box_delivery_marketplace_base",
    "box_delivery_marketplace_coef_expr",
    "box_delivery_marketplace_liter",
    "box_storage_base",
    "box_storage_coef_expr",
    "box_storage_liter",
] as const;

type SheetCellValue = string | number;

export type GoogleSheetsService = {
    buildSheetValues: (rows: GoogleSheetsTariffExportRow[]) => SheetCellValue[][];
    syncCurrentTariffs: () => Promise<void>;
};

function toSheetCellValue(value: string | number | Date | null): SheetCellValue {
    if (value === null) {
        return "";
    }

    if (value instanceof Date) {
        return value.toISOString();
    }

    return value;
}

function toSheetRange(sheetName: string, range: string): string {
    return `${sheetName}!${range}`;
}

function resolveSheetName(sheetName: string): string {
    const normalized = sheetName.trim();
    return normalized === "" ? DEFAULT_SHEET_NAME : normalized;
}

function mapExportRowToSheetRow(row: GoogleSheetsTariffExportRow): SheetCellValue[] {
    return [
        toSheetCellValue(row.tariffDate),
        toSheetCellValue(row.dtNextBox),
        toSheetCellValue(row.dtTillMax),
        toSheetCellValue(row.lastFetchedAt),
        toSheetCellValue(row.warehouseName),
        toSheetCellValue(row.geoName),
        toSheetCellValue(row.boxDeliveryBase),
        toSheetCellValue(row.boxDeliveryCoefExpr),
        toSheetCellValue(row.boxDeliveryLiter),
        toSheetCellValue(row.boxDeliveryMarketplaceBase),
        toSheetCellValue(row.boxDeliveryMarketplaceCoefExpr),
        toSheetCellValue(row.boxDeliveryMarketplaceLiter),
        toSheetCellValue(row.boxStorageBase),
        toSheetCellValue(row.boxStorageCoefExpr),
        toSheetCellValue(row.boxStorageLiter),
    ];
}

export function createGoogleSheetsService(
    dependencies: {
        client?: GoogleSheetsClient;
        repository?: GoogleSheetsRepository;
    } = {},
): GoogleSheetsService {
    const client = dependencies.client ?? createGoogleSheetsClient();
    const repository = dependencies.repository ?? createGoogleSheetsRepository();

    const buildSheetValues = (rows: GoogleSheetsTariffExportRow[]): SheetCellValue[][] => {
        return [Array.from(SHEET_HEADERS), ...rows.map(mapExportRowToSheetRow)];
    };

    return {
        buildSheetValues,

        syncCurrentTariffs: async () => {
            const [spreadsheets, tariffRows] = await Promise.all([
                repository.getActiveSpreadsheets(),
                repository.getTariffsForExportByDate(),
            ]);

            if (spreadsheets.length === 0) {
                return;
            }

            const values = buildSheetValues(tariffRows);

            for (const spreadsheet of spreadsheets) {
                const sheetName = resolveSheetName(spreadsheet.sheetName);

                await client.ensureSheet(spreadsheet.spreadsheetId, sheetName);
                await client.clearRange(spreadsheet.spreadsheetId, sheetName);
                await client.writeRangeValues(
                    spreadsheet.spreadsheetId,
                    values,
                    toSheetRange(sheetName, DEFAULT_WRITE_RANGE),
                );
            }
        },
    };
}
