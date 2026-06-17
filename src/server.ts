import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { cleanupOldTempFiles, startCleanupInterval } from "./services/cleanupService.js";
import { ensureDir } from "./utils/files.js";

async function main(): Promise<void> {
  await ensureDir(env.MEDIA_TMP_DIR);
  await cleanupOldTempFiles();
  startCleanupInterval();

  const app = createApp();
  app.listen(env.PORT, () => {
    logger.info(`Media merge API listening on port ${env.PORT}`);
  });
}

main().catch((error) => {
  logger.fatal({ error }, "Failed to start server");
  process.exit(1);
});
