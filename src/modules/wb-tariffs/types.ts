export type WbTariffsApiWarehouseRow = {
    boxDeliveryBase: string;
    boxDeliveryCoefExpr: string;
    boxDeliveryLiter: string;
    boxDeliveryMarketplaceBase: string;
    boxDeliveryMarketplaceCoefExpr: string;
    boxDeliveryMarketplaceLiter: string;
    boxStorageBase: string;
    boxStorageCoefExpr: string;
    boxStorageLiter: string;
    geoName: string;
    warehouseName: string;
};

export type WbTariffsApiData = {
    dtNextBox: string;
    dtTillMax: string;
    warehouseList: WbTariffsApiWarehouseRow[];
};

export type WbTariffsApiResponse = {
    response: {
        data: WbTariffsApiData;
    };
};

export type WbWarehouseEntity = {
    id: number;
    warehouseName: string;
    geoName: string;
    createdAt: Date;
    updatedAt: Date;
};

export type WbTariffSnapshotEntity = {
    id: number;
    tariffDate: string;
    dtNextBox: string | null;
    dtTillMax: string | null;
    rawPayload: WbTariffsApiResponse;
    lastFetchedAt: Date;
    createdAt: Date;
    updatedAt: Date;
};

export type WbTariffWarehouseEntity = {
    id: number;
    snapshotId: number;
    warehouseId: number;
    boxDeliveryBase: number | null;
    boxDeliveryCoefExpr: number | null;
    boxDeliveryLiter: number | null;
    boxDeliveryMarketplaceBase: number | null;
    boxDeliveryMarketplaceCoefExpr: number | null;
    boxDeliveryMarketplaceLiter: number | null;
    boxStorageBase: number | null;
    boxStorageCoefExpr: number | null;
    boxStorageLiter: number | null;
    sourceRow: WbTariffsApiWarehouseRow;
    createdAt: Date;
    updatedAt: Date;
};

export type CreateWarehouseData = {
    warehouseName: string;
    geoName: string;
};

export type CreateTariffSnapshotData = {
    tariffDate: string;
    dtNextBox: string | null;
    dtTillMax: string | null;
    rawPayload: WbTariffsApiResponse;
    lastFetchedAt: Date;
};

export type CreateTariffWarehouseData = {
    snapshotId: number;
    warehouseId: number;
    boxDeliveryBase: number | null;
    boxDeliveryCoefExpr: number | null;
    boxDeliveryLiter: number | null;
    boxDeliveryMarketplaceBase: number | null;
    boxDeliveryMarketplaceCoefExpr: number | null;
    boxDeliveryMarketplaceLiter: number | null;
    boxStorageBase: number | null;
    boxStorageCoefExpr: number | null;
    boxStorageLiter: number | null;
    sourceRow: WbTariffsApiWarehouseRow;
};

export type WbTariffSyncPayload = {
    tariffDate: string;
    dtNextBox: string | null;
    dtTillMax: string | null;
    lastFetchedAt: Date;
    rawPayload: WbTariffsApiResponse;
    warehouseRows: WbTariffsApiWarehouseRow[];
};
