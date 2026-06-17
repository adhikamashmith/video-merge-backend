import fs from "node:fs/promises";
import path from "node:path";

export async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

export async function removePath(targetPath?: string): Promise<void> {
  if (!targetPath) return;
  await fs.rm(targetPath, { force: true, recursive: true });
}

export function safeExt(filename: string): string {
  return path.extname(filename).toLowerCase().replace(".", "");
}

export async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}
