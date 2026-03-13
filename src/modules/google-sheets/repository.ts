import env from "#config/env/env.js";
import knex from "#postgres/knex.js";
import { getCurrentDateYmd } from "#utils/helpers.js";
import type { Knex } from "knex";

type DbExecutor = Knex | Knex.Transaction;

type SpreadsheetRow = {
    id: number | string;
    spreadsheet_id: string;
    sheet_name: string;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
};

type TariffExportDbRow = {
    tariff_date: string;
    dt_next_box: string | null;
    dt_till_max: string | null;
    last_fetched_at: Date;
    warehouse_name: string;
    geo_name: string;
    box_delivery_base: number | string | null;
    box_delivery_coef_expr: number | string | null;
    box_delivery_liter: number | string | null;
    box_delivery_marketplace_base: number | string | null;
    box_delivery_marketplace_coef_expr: number | string | null;
    box_delivery_marketplace_liter: number | string | null;
    box_storage_base: number | string | null;
    box_storage_coef_expr: number | string | null;
    box_storage_liter: number | string | null;
};

function toNumberOrNull(value: number | string | null): number | null {
    if (value === null) {
        return null;
    }

    return typeof value === "number" ? value : Number(value);
}

function mapSpreadsheetRow(row: SpreadsheetRow): GoogleSpreadsheetTarget {
    return {
        id: typeof row.id === "number" ? row.id : Number(row.id),
        spreadsheetId: row.spreadsheet_id,
        sheetName: row.sheet_name,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function mapTariffExportRow(row: TariffExportDbRow): GoogleSheetsTariffExportRow {
    return {
        tariffDate: row.tariff_date,
        dtNextBox: row.dt_next_box,
        dtTillMax: row.dt_till_max,
        lastFetchedAt: row.last_fetched_at,
        warehouseName: row.warehouse_name,
        geoName: row.geo_name,
        boxDeliveryBase: toNumberOrNull(row.box_delivery_base),
        boxDeliveryCoefExpr: toNumberOrNull(row.box_delivery_coef_expr),
        boxDeliveryLiter: toNumberOrNull(row.box_delivery_liter),
        boxDeliveryMarketplaceBase: toNumberOrNull(row.box_delivery_marketplace_base),
        boxDeliveryMarketplaceCoefExpr: toNumberOrNull(row.box_delivery_marketplace_coef_expr),
        boxDeliveryMarketplaceLiter: toNumberOrNull(row.box_delivery_marketplace_liter),
        boxStorageBase: toNumberOrNull(row.box_storage_base),
        boxStorageCoefExpr: toNumberOrNull(row.box_storage_coef_expr),
        boxStorageLiter: toNumberOrNull(row.box_storage_liter),
    };
}

export type GoogleSpreadsheetTarget = {
    id: number;
    spreadsheetId: string;
    sheetName: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
};

export type GoogleSheetsTariffExportRow = {
    tariffDate: string;
    dtNextBox: string | null;
    dtTillMax: string | null;
    lastFetchedAt: Date;
    warehouseName: string;
    geoName: string;
    boxDeliveryBase: number | null;
    boxDeliveryCoefExpr: number | null;
    boxDeliveryLiter: number | null;
    boxDeliveryMarketplaceBase: number | null;
    boxDeliveryMarketplaceCoefExpr: number | null;
    boxDeliveryMarketplaceLiter: number | null;
    boxStorageBase: number | null;
    boxStorageCoefExpr: number | null;
    boxStorageLiter: number | null;
};

export type GoogleSheetsRepository = {
    getActiveSpreadsheets: () => Promise<GoogleSpreadsheetTarget[]>;
    getTariffsForExportByDate: (tariffDate?: string) => Promise<GoogleSheetsTariffExportRow[]>;
    ensureSpreadsheets: (spreadsheetIds: string[], sheetName: string) => Promise<void>;
};

export function createGoogleSheetsRepository(db: DbExecutor = knex): GoogleSheetsRepository {
    return {
        ensureSpreadsheets: async (spreadsheetIds, sheetName) => {
            const uniqueSpreadsheetIds = [...new Set(spreadsheetIds.map((item) => item.trim()).filter((item) => item !== ""))];

            for (const spreadsheetId of uniqueSpreadsheetIds) {
                await db<SpreadsheetRow>("spreadsheets")
                    .insert({
                        spreadsheet_id: spreadsheetId,
                        sheet_name: sheetName,
                        is_active: true,
                    })
                    .onConflict("spreadsheet_id")
                    .merge({
                        sheet_name: sheetName,
                        is_active: true,
                        updated_at: db.fn.now(),
                    });
            }
        },

        getActiveSpreadsheets: async () => {
            const rows = await db<SpreadsheetRow>("spreadsheets")
                .select("*")
                .where({ is_active: true })
                .orderBy("id", "asc");

            return rows.map(mapSpreadsheetRow);
        },

        getTariffsForExportByDate: async (tariffDate = getCurrentDateYmd(new Date(), env.APP_TIMEZONE)) => {
            const rows = await db<TariffExportDbRow>("tariff_box_snapshots as snapshots")
                .innerJoin(
                    "tariff_box_warehouse_tariffs as tariffs",
                    "tariffs.snapshot_id",
                    "snapshots.id",
                )
                .innerJoin("warehouses as warehouses", "warehouses.id", "tariffs.warehouse_id")
                .select([
                    "snapshots.tariff_date",
                    "snapshots.dt_next_box",
                    "snapshots.dt_till_max",
                    "snapshots.last_fetched_at",
                    "warehouses.warehouse_name",
                    "warehouses.geo_name",
                    "tariffs.box_delivery_base",
                    "tariffs.box_delivery_coef_expr",
                    "tariffs.box_delivery_liter",
                    "tariffs.box_delivery_marketplace_base",
                    "tariffs.box_delivery_marketplace_coef_expr",
                    "tariffs.box_delivery_marketplace_liter",
                    "tariffs.box_storage_base",
                    "tariffs.box_storage_coef_expr",
                    "tariffs.box_storage_liter",
                ])
                .where("snapshots.tariff_date", tariffDate)
                .orderBy([
                    {
                        column: "tariffs.box_delivery_coef_expr",
                        order: "asc",
                        nulls: "last",
                    },
                    {
                        column: "warehouses.warehouse_name",
                        order: "asc",
                    },
                ]);

            return rows.map(mapTariffExportRow);
        },
    };
}
