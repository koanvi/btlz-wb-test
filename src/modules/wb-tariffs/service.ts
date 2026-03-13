import { createWbTariffsClient, type WbTariffsClient } from "#modules/wb-tariffs/client.js";
import { createWbTariffsRepository, type WbTariffsRepository } from "#modules/wb-tariffs/repository.js";
import type {
    WbTariffsApiResponse,
    WbTariffsApiWarehouseRow,
    WbTariffSyncPayload,
} from "#modules/wb-tariffs/types.js";
import knex from "#postgres/knex.js";
import { getCurrentDateYmd, parseWbNumber, toNullableString } from "#utils/helpers.js";
import type { Knex } from "knex";

export class WbTariffsServiceError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "WbTariffsServiceError";
    }
}

export type WbTariffsService = {
    syncCurrentTariffs: (date?: string) => Promise<WbTariffSyncPayload>;
};

function isWarehouseRow(value: unknown): value is WbTariffsApiWarehouseRow {
    if (typeof value !== "object" || value === null) {
        return false;
    }

    const row = value as Record<string, unknown>;

    return (
        typeof row.boxDeliveryBase === "string" &&
        typeof row.boxDeliveryCoefExpr === "string" &&
        typeof row.boxDeliveryLiter === "string" &&
        typeof row.boxDeliveryMarketplaceBase === "string" &&
        typeof row.boxDeliveryMarketplaceCoefExpr === "string" &&
        typeof row.boxDeliveryMarketplaceLiter === "string" &&
        typeof row.boxStorageBase === "string" &&
        typeof row.boxStorageCoefExpr === "string" &&
        typeof row.boxStorageLiter === "string" &&
        typeof row.geoName === "string" &&
        typeof row.warehouseName === "string"
    );
}

function assertMinimalApiPayload(payload: WbTariffsApiResponse): asserts payload is WbTariffsApiResponse {
    const data = payload.response?.data;

    if (typeof data !== "object" || data === null) {
        throw new WbTariffsServiceError("WB tariffs payload does not contain response.data");
    }

    if (!Array.isArray(data.warehouseList)) {
        throw new WbTariffsServiceError("WB tariffs payload does not contain warehouseList");
    }

    if (typeof data.dtNextBox !== "string" || typeof data.dtTillMax !== "string") {
        throw new WbTariffsServiceError("WB tariffs payload contains invalid date fields");
    }

    for (const row of data.warehouseList) {
        if (!isWarehouseRow(row)) {
            throw new WbTariffsServiceError("WB tariffs payload contains invalid warehouse row");
        }
    }
}

async function savePayload(
    trx: Knex.Transaction,
    repository: WbTariffsRepository,
    tariffDate: string,
    payload: WbTariffsApiResponse,
): Promise<WbTariffSyncPayload> {
    const lastFetchedAt = new Date();
    const warehouseRows = payload.response.data.warehouseList;

    const snapshot = await repository.upsertSnapshot({
        tariffDate,
        dtNextBox: toNullableString(payload.response.data.dtNextBox),
        dtTillMax: toNullableString(payload.response.data.dtTillMax),
        rawPayload: payload,
        lastFetchedAt,
    });

    const warehouseIds: number[] = [];

    for (const row of warehouseRows) {
        const warehouse = await repository.upsertWarehouse({
            warehouseName: row.warehouseName,
            geoName: row.geoName,
        });

        warehouseIds.push(warehouse.id);

        await repository.upsertTariffRow({
            snapshotId: snapshot.id,
            warehouseId: warehouse.id,
            boxDeliveryBase: parseWbNumber(row.boxDeliveryBase),
            boxDeliveryCoefExpr: parseWbNumber(row.boxDeliveryCoefExpr),
            boxDeliveryLiter: parseWbNumber(row.boxDeliveryLiter),
            boxDeliveryMarketplaceBase: parseWbNumber(row.boxDeliveryMarketplaceBase),
            boxDeliveryMarketplaceCoefExpr: parseWbNumber(row.boxDeliveryMarketplaceCoefExpr),
            boxDeliveryMarketplaceLiter: parseWbNumber(row.boxDeliveryMarketplaceLiter),
            boxStorageBase: parseWbNumber(row.boxStorageBase),
            boxStorageCoefExpr: parseWbNumber(row.boxStorageCoefExpr),
            boxStorageLiter: parseWbNumber(row.boxStorageLiter),
            sourceRow: row,
        });
    }

    await repository.deleteSnapshotTariffRowsExceptWarehouses(snapshot.id, warehouseIds);
    void trx;

    return {
        tariffDate: snapshot.tariffDate,
        dtNextBox: snapshot.dtNextBox,
        dtTillMax: snapshot.dtTillMax,
        lastFetchedAt: snapshot.lastFetchedAt,
        rawPayload: snapshot.rawPayload,
        warehouseRows,
    };
}

export function createWbTariffsService(
    dependencies: {
        client?: WbTariffsClient;
        repositoryFactory?: (db: Knex | Knex.Transaction) => WbTariffsRepository;
    } = {},
): WbTariffsService {
    const client = dependencies.client ?? createWbTariffsClient();
    const repositoryFactory = dependencies.repositoryFactory ?? createWbTariffsRepository;

    return {
        syncCurrentTariffs: async (date = getCurrentDateYmd()) => {
            const payload = await client.getBoxTariffs(date);
            assertMinimalApiPayload(payload);

            return knex.transaction(async (trx) => {
                const repository = repositoryFactory(trx);
                return savePayload(trx, repository, date, payload);
            });
        },
    };
}
