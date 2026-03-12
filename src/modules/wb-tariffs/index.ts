import type { WbTariffSyncPayload } from "#modules/wb-tariffs/types.js";
export { createWbTariffsClient, WbTariffsClientError } from "#modules/wb-tariffs/client.js";
export { createWbTariffsRepository } from "#modules/wb-tariffs/repository.js";

export type WbTariffsModule = {
    syncTariffs: () => Promise<WbTariffSyncPayload[]>;
};

export function createWbTariffsModule(): WbTariffsModule {
    return {
        syncTariffs: async () => {
            return [];
        },
    };
}

export type {
    CreateTariffSnapshotData,
    CreateTariffWarehouseData,
    CreateWarehouseData,
    WbTariffsApiData,
    WbTariffsApiResponse,
    WbTariffsApiWarehouseRow,
    WbTariffSnapshotEntity,
    WbTariffSyncPayload,
    WbTariffWarehouseEntity,
    WbWarehouseEntity,
} from "#modules/wb-tariffs/types.js";
