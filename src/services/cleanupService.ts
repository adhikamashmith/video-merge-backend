import fs from "node:fs/promises";
import path from "node:path";
import { env, uploadTtlMs } from "../config/env.js";
import { logger } from "../config/logger.js";
import { ensureDir, removePath } from "../utils/files.js";

const directories = ["uploads", "jobs"];

export async function cleanupOldTempFiles(now = Date.now()): Promise<void> {
  await ensureDir(env.MEDIA_TMP_DIR);

  await Promise.all(
    directories.map(async (dirName) => {
      const dir = path.join(env.MEDIA_TMP_DIR, dirName);
      await ensureDir(dir);
      const entries = await fs.readdir(dir, { withFileTypes: true });

      await Promise.all(
        entries.map(async (entry) => {
          const fullPath = path.join(dir, entry.name);
          const stats = await fs.stat(fullPath);
          if (now - stats.mtimeMs > uploadTtlMs) {
            await removePath(fullPath);
          }
        })
      );
    })
  );
}

export function startCleanupInterval(): NodeJS.Timeout {
  const interval = setInterval(() => {
    cleanupOldTempFiles().catch((error) => {
      logger.warn({ error }, "Temporary file cleanup failed");
    });
  }, Math.min(uploadTtlMs, 15 * 60 * 1000));

  interval.unref();
  return interval;
}
