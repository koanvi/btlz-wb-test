import { createGoogleSheetsModule } from "#modules/google-sheets/index.js";
import { createWbTariffsModule } from "#modules/wb-tariffs/index.js";
import { migrate, seed } from "#postgres/knex.js";
import { seconds } from "#utils/helpers.js";
import { logger } from "#utils/logger.js";
import { createScheduler } from "#utils/scheduler.js";

const wbTariffsModule = createWbTariffsModule();
const googleSheetsModule = createGoogleSheetsModule();

const scheduler = createScheduler({
    name: "wb-tariffs-sync",
    intervalMs: seconds(60),
    run: async () => {
        const rows = await wbTariffsModule.syncTariffs();
        await googleSheetsModule.updateRows(rows);
        logger.info("Scheduled sync tick completed");
    },
});

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
