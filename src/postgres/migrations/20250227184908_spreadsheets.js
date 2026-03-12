/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
export async function up(knex) {
    await knex.schema.createTable("warehouses", (table) => {
        table.bigIncrements("id").primary();
        table.text("warehouse_name").notNullable().unique();
        table.text("geo_name").notNullable();
        table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
        table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

        table.index(["geo_name"], "warehouses_geo_name_idx");
    });

    await knex.schema.createTable("tariff_box_snapshots", (table) => {
        table.bigIncrements("id").primary();
        table.date("tariff_date").notNullable().unique();
        table.date("dt_next_box").nullable();
        table.date("dt_till_max").nullable();
        table.jsonb("raw_payload").notNullable();
        table.timestamp("last_fetched_at", { useTz: true }).notNullable();
        table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
        table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

        table.index(["last_fetched_at"], "tariff_box_snapshots_last_fetched_at_idx");
    });

    await knex.schema.createTable("spreadsheets", (table) => {
        table.bigIncrements("id").primary();
        table.text("spreadsheet_id").notNullable().unique();
        table.text("sheet_name").notNullable().defaultTo("stocks_coefs");
        table.boolean("is_active").notNullable().defaultTo(true);
        table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
        table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

        table.index(["is_active"], "spreadsheets_is_active_idx");
    });

    await knex.schema.createTable("job_runs", (table) => {
        table.bigIncrements("id").primary();
        table.text("job_name").notNullable();
        table.text("status").notNullable();
        table.timestamp("started_at", { useTz: true }).notNullable();
        table.timestamp("finished_at", { useTz: true }).nullable();
        table.jsonb("details").nullable();
        table.text("error_text").nullable();

        table.index(["job_name", "started_at"], "job_runs_job_name_started_at_idx");
        table.index(["status"], "job_runs_status_idx");
    });

    await knex.schema.createTable("tariff_box_warehouse_tariffs", (table) => {
        table.bigIncrements("id").primary();
        table
            .bigInteger("snapshot_id")
            .notNullable()
            .references("id")
            .inTable("tariff_box_snapshots")
            .onDelete("CASCADE");
        table
            .bigInteger("warehouse_id")
            .notNullable()
            .references("id")
            .inTable("warehouses")
            .onDelete("RESTRICT");
        table.decimal("box_delivery_base", 12, 4).nullable();
        table.decimal("box_delivery_coef_expr", 12, 4).nullable();
        table.decimal("box_delivery_liter", 12, 4).nullable();
        table.decimal("box_delivery_marketplace_base", 12, 4).nullable();
        table.decimal("box_delivery_marketplace_coef_expr", 12, 4).nullable();
        table.decimal("box_delivery_marketplace_liter", 12, 4).nullable();
        table.decimal("box_storage_base", 12, 4).nullable();
        table.decimal("box_storage_coef_expr", 12, 4).nullable();
        table.decimal("box_storage_liter", 12, 4).nullable();
        table.jsonb("source_row").notNullable();
        table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
        table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

        table.unique(["snapshot_id", "warehouse_id"], {
            indexName: "tariff_box_warehouse_tariffs_snapshot_warehouse_unique",
        });
        table.index(["warehouse_id"], "tariff_box_warehouse_tariffs_warehouse_id_idx");
    });
}

/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
export async function down(knex) {
    await knex.schema.dropTableIfExists("tariff_box_warehouse_tariffs");
    await knex.schema.dropTableIfExists("job_runs");
    await knex.schema.dropTableIfExists("spreadsheets");
    await knex.schema.dropTableIfExists("tariff_box_snapshots");
    await knex.schema.dropTableIfExists("warehouses");
}
