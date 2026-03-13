import env from "#config/env/env.js";
import { createGoogleSheetsService } from "#modules/google-sheets/service.js";
import { createWbTariffsService } from "#modules/wb-tariffs/service.js";
import { migrate, seed } from "#postgres/knex.js";
import { logger } from "#utils/logger.js";
import { createScheduler } from "#utils/scheduler.js";

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

await migrate.latest();
await seed.run();

logger.info("Bootstrap completed");
scheduler.start();

for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
        logger.info(`Received ${signal}. Stopping scheduler`);
        scheduler.stop();
        process.exit(0);
    });
}
