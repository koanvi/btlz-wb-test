import knex from "#postgres/knex.js";
import type {
    CreateTariffSnapshotData,
    CreateTariffWarehouseData,
    CreateWarehouseData,
    WbTariffSnapshotEntity,
    WbTariffWarehouseEntity,
    WbWarehouseEntity,
} from "#modules/wb-tariffs/types.js";
import type { Knex } from "knex";

type DbExecutor = Knex | Knex.Transaction;

type WarehouseRow = {
    id: number | string;
    warehouse_name: string;
    geo_name: string;
    created_at: Date;
    updated_at: Date;
};

type TariffSnapshotRow = {
    id: number | string;
    tariff_date: string;
    dt_next_box: string | null;
    dt_till_max: string | null;
    raw_payload: WbTariffSnapshotEntity["rawPayload"];
    last_fetched_at: Date;
    created_at: Date;
    updated_at: Date;
};

type TariffWarehouseRow = {
    id: number | string;
    snapshot_id: number | string;
    warehouse_id: number | string;
    box_delivery_base: number | string | null;
    box_delivery_coef_expr: number | string | null;
    box_delivery_liter: number | string | null;
    box_delivery_marketplace_base: number | string | null;
    box_delivery_marketplace_coef_expr: number | string | null;
    box_delivery_marketplace_liter: number | string | null;
    box_storage_base: number | string | null;
    box_storage_coef_expr: number | string | null;
    box_storage_liter: number | string | null;
    source_row: WbTariffWarehouseEntity["sourceRow"];
    created_at: Date;
    updated_at: Date;
};

function toNumber(value: number | string): number {
    return typeof value === "number" ? value : Number(value);
}

function toNullableNumber(value: number | string | null): number | null {
    if (value === null) {
        return null;
    }

    return typeof value === "number" ? value : Number(value);
}

function mapWarehouseRow(row: WarehouseRow): WbWarehouseEntity {
    return {
        id: toNumber(row.id),
        warehouseName: row.warehouse_name,
        geoName: row.geo_name,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function mapTariffSnapshotRow(row: TariffSnapshotRow): WbTariffSnapshotEntity {
    return {
        id: toNumber(row.id),
        tariffDate: row.tariff_date,
        dtNextBox: row.dt_next_box,
        dtTillMax: row.dt_till_max,
        rawPayload: row.raw_payload,
        lastFetchedAt: row.last_fetched_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function mapTariffWarehouseRow(row: TariffWarehouseRow): WbTariffWarehouseEntity {
    return {
        id: toNumber(row.id),
        snapshotId: toNumber(row.snapshot_id),
        warehouseId: toNumber(row.warehouse_id),
        boxDeliveryBase: toNullableNumber(row.box_delivery_base),
        boxDeliveryCoefExpr: toNullableNumber(row.box_delivery_coef_expr),
        boxDeliveryLiter: toNullableNumber(row.box_delivery_liter),
        boxDeliveryMarketplaceBase: toNullableNumber(row.box_delivery_marketplace_base),
        boxDeliveryMarketplaceCoefExpr: toNullableNumber(row.box_delivery_marketplace_coef_expr),
        boxDeliveryMarketplaceLiter: toNullableNumber(row.box_delivery_marketplace_liter),
        boxStorageBase: toNullableNumber(row.box_storage_base),
        boxStorageCoefExpr: toNullableNumber(row.box_storage_coef_expr),
        boxStorageLiter: toNullableNumber(row.box_storage_liter),
        sourceRow: row.source_row,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

export type WbTariffsRepository = {
    upsertWarehouse: (data: CreateWarehouseData) => Promise<WbWarehouseEntity>;
    upsertSnapshot: (data: CreateTariffSnapshotData) => Promise<WbTariffSnapshotEntity>;
    upsertTariffRow: (data: CreateTariffWarehouseData) => Promise<WbTariffWarehouseEntity>;
    getSnapshotByDate: (tariffDate: string) => Promise<WbTariffSnapshotEntity | null>;
    deleteSnapshotTariffRowsExceptWarehouses: (snapshotId: number, warehouseIds: number[]) => Promise<number>;
};

export function createWbTariffsRepository(db: DbExecutor = knex): WbTariffsRepository {
    return {
        upsertWarehouse: async (data) => {
            const [row] = await db<WarehouseRow>("warehouses")
                .insert({
                    warehouse_name: data.warehouseName,
                    geo_name: data.geoName,
                })
                .onConflict("warehouse_name")
                .merge({
                    geo_name: data.geoName,
                    updated_at: db.fn.now(),
                })
                .returning("*");

            return mapWarehouseRow(row);
        },

        upsertSnapshot: async (data) => {
            const [row] = await db<TariffSnapshotRow>("tariff_box_snapshots")
                .insert({
                    tariff_date: data.tariffDate,
                    dt_next_box: data.dtNextBox,
                    dt_till_max: data.dtTillMax,
                    raw_payload: data.rawPayload,
                    last_fetched_at: data.lastFetchedAt,
                })
                .onConflict("tariff_date")
                .merge({
                    dt_next_box: data.dtNextBox,
                    dt_till_max: data.dtTillMax,
                    raw_payload: data.rawPayload,
                    last_fetched_at: data.lastFetchedAt,
                    updated_at: db.fn.now(),
                })
                .returning("*");

            return mapTariffSnapshotRow(row);
        },

        upsertTariffRow: async (data) => {
            const [row] = await db<TariffWarehouseRow>("tariff_box_warehouse_tariffs")
                .insert({
                    snapshot_id: data.snapshotId,
                    warehouse_id: data.warehouseId,
                    box_delivery_base: data.boxDeliveryBase,
                    box_delivery_coef_expr: data.boxDeliveryCoefExpr,
                    box_delivery_liter: data.boxDeliveryLiter,
                    box_delivery_marketplace_base: data.boxDeliveryMarketplaceBase,
                    box_delivery_marketplace_coef_expr: data.boxDeliveryMarketplaceCoefExpr,
                    box_delivery_marketplace_liter: data.boxDeliveryMarketplaceLiter,
                    box_storage_base: data.boxStorageBase,
                    box_storage_coef_expr: data.boxStorageCoefExpr,
                    box_storage_liter: data.boxStorageLiter,
                    source_row: data.sourceRow,
                })
                .onConflict(["snapshot_id", "warehouse_id"])
                .merge({
                    box_delivery_base: data.boxDeliveryBase,
                    box_delivery_coef_expr: data.boxDeliveryCoefExpr,
                    box_delivery_liter: data.boxDeliveryLiter,
                    box_delivery_marketplace_base: data.boxDeliveryMarketplaceBase,
                    box_delivery_marketplace_coef_expr: data.boxDeliveryMarketplaceCoefExpr,
                    box_delivery_marketplace_liter: data.boxDeliveryMarketplaceLiter,
                    box_storage_base: data.boxStorageBase,
                    box_storage_coef_expr: data.boxStorageCoefExpr,
                    box_storage_liter: data.boxStorageLiter,
                    source_row: data.sourceRow,
                    updated_at: db.fn.now(),
                })
                .returning("*");

            return mapTariffWarehouseRow(row);
        },

        getSnapshotByDate: async (tariffDate) => {
            const row = await db<TariffSnapshotRow>("tariff_box_snapshots").where({ tariff_date: tariffDate }).first();

            return row ? mapTariffSnapshotRow(row) : null;
        },

        deleteSnapshotTariffRowsExceptWarehouses: async (snapshotId, warehouseIds) => {
            const query = db("tariff_box_warehouse_tariffs").where({ snapshot_id: snapshotId });

            if (warehouseIds.length > 0) {
                query.whereNotIn("warehouse_id", warehouseIds);
            }

            return query.delete();
        },
    };
}
