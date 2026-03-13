import env from "#config/env/env.js";
import { createGoogleSheetsService } from "#modules/google-sheets/service.js";
import { createWbTariffsService } from "#modules/wb-tariffs/service.js";
import knex, { migrate } from "#postgres/knex.js";
import { logger } from "#utils/logger.js";
import { createScheduler } from "#utils/scheduler.js";

try {
    logger.info("Application starting");
    logger.info("Environment loaded", {
        node_env: env.NODE_ENV ?? "development",
        wb_tariffs_sync_cron: env.WB_TARIFFS_SYNC_CRON,
        google_sheets_sync_cron: env.GOOGLE_SHEETS_SYNC_CRON,
        google_spreadsheet_count: env.GOOGLE_SPREADSHEET_IDS.length,
        google_spreadsheet_sheet_name: env.GOOGLE_SPREADSHEET_SHEET_NAME,
    });

    logger.info("Initializing database connection");
    await knex.raw("select 1");
    logger.info("Database connection initialized");

    logger.info("Running migrations");
    await migrate.latest();
    logger.info("Migrations completed");

    const wbTariffsService = createWbTariffsService();
    const googleSheetsService = createGoogleSheetsService();

    logger.info("Services initialized");

    if (env.WB_TARIFFS_SYNC_RUN_ON_START) {
        logger.info("Running initial WB tariffs sync");
        await wbTariffsService.syncCurrentTariffs();
        logger.info("Initial WB tariffs sync completed");
    }

    if (env.GOOGLE_SHEETS_SYNC_RUN_ON_START) {
        logger.info("Running initial Google Sheets sync");
        await googleSheetsService.syncCurrentTariffs();
        logger.info("Initial Google Sheets sync completed");
    }

    const scheduler = createScheduler([
        {
            name: "wb-tariffs-sync",
            cron: env.WB_TARIFFS_SYNC_CRON,
            runOnStart: false,
            run: async () => {
                await wbTariffsService.syncCurrentTariffs();
            },
        },
        {
            name: "google-sheets-sync",
            cron: env.GOOGLE_SHEETS_SYNC_CRON,
            runOnStart: false,
            run: async () => {
                await googleSheetsService.syncCurrentTariffs();
            },
        },
    ]);

    let isShuttingDown = false;

    const shutdown = async (signal: string) => {
        if (isShuttingDown) {
            return;
        }

        isShuttingDown = true;

        logger.info(`Received ${signal}. Stopping scheduler and closing database connection`);
        scheduler.stop();

        try {
            await knex.destroy();
            logger.info("Database connection closed");
        } catch (error) {
            logger.error("Failed to close database connection", error);
        } finally {
            process.exit(0);
        }
    };

    for (const signal of ["SIGINT", "SIGTERM"] as const) {
        process.on(signal, () => {
            void shutdown(signal);
        });
    }

    logger.info("Bootstrap completed");
    scheduler.start();
    logger.info("Scheduler started");
} catch (error) {
    logger.error("Application bootstrap failed", error);

    try {
        await knex.destroy();
    } catch (destroyError) {
        logger.error("Failed to close database connection after bootstrap error", destroyError);
    }

    process.exit(1);
}
