import { spawn } from "node:child_process";
import { env } from "../config/env.js";
import { AppError } from "../errors/AppError.js";
import type { ProbeResult } from "../types/media.js";

export class ProbeService {
  async probe(filePath: string): Promise<ProbeResult> {
    const args = [
      "-v",
      "error",
      "-print_format",
      "json",
      "-show_format",
      "-show_streams",
      filePath
    ];

    const { stdout, stderr, code } = await runProcess(env.FFPROBE_PATH, args);

    if (code !== 0) {
      throw new AppError(422, "CORRUPTED_OR_UNREADABLE_MEDIA", "FFprobe could not read the uploaded media.", stderr);
    }

    try {
      return JSON.parse(stdout) as ProbeResult;
    } catch (error) {
      throw new AppError(422, "INVALID_PROBE_OUTPUT", "FFprobe returned invalid metadata.", {
        cause: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

async function runProcess(
  command: string,
  args: string[]
): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true });
    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      reject(new AppError(500, "FFPROBE_NOT_AVAILABLE", "FFprobe is not available on the server.", error.message));
    });
    child.on("close", (code) => {
      resolve({ stdout, stderr, code });
    });
  });
}
