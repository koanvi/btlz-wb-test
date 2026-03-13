/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
export async function seed(knex) {
    const tariffDate = "2099-01-01";
    const now = new Date();

    const warehouseRows = [
        {
            warehouse_name: "Тестовый склад 1",
            geo_name: "Центральный федеральный округ",
        },
        {
            warehouse_name: "Тестовый склад 2",
            geo_name: "Приволжский федеральный округ",
        },
        {
            warehouse_name: "Тестовый склад 3",
            geo_name: "Северо-Западный федеральный округ",
        },
    ];

    const sourceWarehouseRows = [
        {
            boxDeliveryBase: "12,5",
            boxDeliveryCoefExpr: "55",
            boxDeliveryLiter: "6,2",
            boxDeliveryMarketplaceBase: "10,1",
            boxDeliveryMarketplaceCoefExpr: "45",
            boxDeliveryMarketplaceLiter: "5,4",
            boxStorageBase: "4,5",
            boxStorageCoefExpr: "35",
            boxStorageLiter: "2,1",
            geoName: "Центральный федеральный округ",
            warehouseName: "Тестовый склад 1",
        },
        {
            boxDeliveryBase: "14,7",
            boxDeliveryCoefExpr: "65",
            boxDeliveryLiter: "7,1",
            boxDeliveryMarketplaceBase: "11,8",
            boxDeliveryMarketplaceCoefExpr: "52",
            boxDeliveryMarketplaceLiter: "6,3",
            boxStorageBase: "5,2",
            boxStorageCoefExpr: "42",
            boxStorageLiter: "2,8",
            geoName: "Приволжский федеральный округ",
            warehouseName: "Тестовый склад 2",
        },
        {
            boxDeliveryBase: "16,4",
            boxDeliveryCoefExpr: "75",
            boxDeliveryLiter: "8,0",
            boxDeliveryMarketplaceBase: "13,5",
            boxDeliveryMarketplaceCoefExpr: "60",
            boxDeliveryMarketplaceLiter: "7,4",
            boxStorageBase: "6,1",
            boxStorageCoefExpr: "50",
            boxStorageLiter: "3,5",
            geoName: "Северо-Западный федеральный округ",
            warehouseName: "Тестовый склад 3",
        },
    ];

    await knex("spreadsheets").whereIn("spreadsheet_id", [
        "test-spreadsheet-local-1",
        "test-spreadsheet-local-2",
    ]).delete();
    const existingSnapshot = await knex("tariff_box_snapshots")
        .select("id")
        .where({ tariff_date: tariffDate })
        .first();

    if (existingSnapshot) {
        await knex("tariff_box_warehouse_tariffs")
            .where({ snapshot_id: Number(existingSnapshot.id) })
            .delete();

        await knex("tariff_box_snapshots")
            .where({ id: Number(existingSnapshot.id) })
            .delete();
    }

    await knex("warehouses").whereIn(
        "warehouse_name",
        warehouseRows.map((row) => row.warehouse_name),
    ).delete();

    const insertedWarehouses = await knex("warehouses")
        .insert(warehouseRows)
        .returning(["id", "warehouse_name"]);

    const warehouseIdByName = new Map(
        insertedWarehouses.map((row) => [row.warehouse_name, Number(row.id)]),
    );

    const rawPayload = {
        response: {
            data: {
                dtNextBox: tariffDate,
                dtTillMax: tariffDate,
                warehouseList: sourceWarehouseRows,
            },
        },
    };

    const [snapshot] = await knex("tariff_box_snapshots")
        .insert({
            tariff_date: tariffDate,
            dt_next_box: tariffDate,
            dt_till_max: tariffDate,
            raw_payload: rawPayload,
            last_fetched_at: now,
        })
        .returning(["id"]);

    const snapshotId = Number(snapshot.id);

    await knex("tariff_box_warehouse_tariffs").insert([
        {
            snapshot_id: snapshotId,
            warehouse_id: warehouseIdByName.get("Тестовый склад 1"),
            box_delivery_base: 12.5,
            box_delivery_coef_expr: 55,
            box_delivery_liter: 6.2,
            box_delivery_marketplace_base: 10.1,
            box_delivery_marketplace_coef_expr: 45,
            box_delivery_marketplace_liter: 5.4,
            box_storage_base: 4.5,
            box_storage_coef_expr: 35,
            box_storage_liter: 2.1,
            source_row: sourceWarehouseRows[0],
        },
        {
            snapshot_id: snapshotId,
            warehouse_id: warehouseIdByName.get("Тестовый склад 2"),
            box_delivery_base: 14.7,
            box_delivery_coef_expr: 65,
            box_delivery_liter: 7.1,
            box_delivery_marketplace_base: 11.8,
            box_delivery_marketplace_coef_expr: 52,
            box_delivery_marketplace_liter: 6.3,
            box_storage_base: 5.2,
            box_storage_coef_expr: 42,
            box_storage_liter: 2.8,
            source_row: sourceWarehouseRows[1],
        },
        {
            snapshot_id: snapshotId,
            warehouse_id: warehouseIdByName.get("Тестовый склад 3"),
            box_delivery_base: 16.4,
            box_delivery_coef_expr: 75,
            box_delivery_liter: 8.0,
            box_delivery_marketplace_base: 13.5,
            box_delivery_marketplace_coef_expr: 60,
            box_delivery_marketplace_liter: 7.4,
            box_storage_base: 6.1,
            box_storage_coef_expr: 50,
            box_storage_liter: 3.5,
            source_row: sourceWarehouseRows[2],
        },
    ]);

    await knex("spreadsheets").insert([
        {
            spreadsheet_id: "test-spreadsheet-local-1",
            sheet_name: "stocks_coefs",
            is_active: false,
        },
        {
            spreadsheet_id: "test-spreadsheet-local-2",
            sheet_name: "stocks_coefs",
            is_active: false,
        },
    ]);
}
