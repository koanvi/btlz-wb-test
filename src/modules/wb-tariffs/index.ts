import { createWbTariffsService } from "#modules/wb-tariffs/service.js";
import type { WbTariffSyncPayload } from "#modules/wb-tariffs/types.js";
export { createWbTariffsClient, WbTariffsClientError } from "#modules/wb-tariffs/client.js";
export { createWbTariffsRepository } from "#modules/wb-tariffs/repository.js";
export { createWbTariffsService, WbTariffsServiceError } from "#modules/wb-tariffs/service.js";

export type WbTariffsModule = {
    syncTariffs: () => Promise<WbTariffSyncPayload[]>;
};

export function createWbTariffsModule(): WbTariffsModule {
    const service = createWbTariffsService();

    return {
        syncTariffs: async () => {
            return [await service.syncCurrentTariffs()];
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
