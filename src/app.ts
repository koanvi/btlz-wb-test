import env from "#config/env/env.js";
import { createGoogleSheetsService } from "#modules/google-sheets/service.js";
import { createWbTariffsService } from "#modules/wb-tariffs/service.js";
import { migrate, seed } from "#postgres/knex.js";
import { logger } from "#utils/logger.js";
import { createScheduler } from "#utils/scheduler.js";

logger.info("Application starting");

const wbTariffsService = createWbTariffsService();
const googleSheetsService = createGoogleSheetsService();

const scheduler = createScheduler([
    {
        name: "wb-tariffs-sync",
        cron: env.WB_TARIFFS_SYNC_CRON,
        runOnStart: env.WB_TARIFFS_SYNC_RUN_ON_START,
        run: async () => {
            await wbTariffsService.syncCurrentTariffs();
        },
    },
    {
        name: "google-sheets-sync",
        cron: env.GOOGLE_SHEETS_SYNC_CRON,
        runOnStart: env.GOOGLE_SHEETS_SYNC_RUN_ON_START,
        run: async () => {
            await googleSheetsService.syncCurrentTariffs();
        },
    },
]);

try {
    logger.info("Running migrations");
    await migrate.latest();
    logger.info("Migrations completed");

    logger.info("Running seeds");
    await seed.run();
    logger.info("Seeds completed");

    logger.info("Bootstrap completed");
    scheduler.start();
} catch (error) {
    logger.error("Application bootstrap failed", error);
    process.exit(1);
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
        logger.info(`Received ${signal}. Stopping scheduler`);
        scheduler.stop();
        process.exit(0);
    });
}
