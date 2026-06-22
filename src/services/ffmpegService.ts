import { spawn } from "node:child_process";
import path from "node:path";
import { env } from "../config/env.js";
import { AppError } from "../errors/AppError.js";
import type { ClassifiedMedia, MergeJob } from "../types/media.js";

export interface FfmpegProgress {
  percent?: number;
  timemark?: string;
}

export class FfmpegService {
  async merge(job: MergeJob): Promise<void> {
    if (job.media1.kind === "video") {
      try {
        await runFfmpeg(buildVideoCopyArgs(job.media1, job.media2, job.outputPath));
        return;
      } catch {
        await runFfmpeg(buildMergeArgs(job.media1, job.media2, job.outputPath));
        return;
      }
    }

    await runFfmpeg(buildMergeArgs(job.media1, job.media2, job.outputPath));
  }
}

export function buildMergeArgs(media1: ClassifiedMedia, media2: ClassifiedMedia, outputPath: string): string[] {
  const audioDuration = media2.durationSeconds;
  if (!audioDuration || audioDuration <= 0) {
    throw new AppError(422, "AUDIO_DURATION_UNAVAILABLE", "The source audio duration could not be determined.");
  }

  const videoFilter = `scale=-2:min(${env.OUTPUT_MAX_HEIGHT}\\,ih):force_original_aspect_ratio=decrease,format=yuv420p`;

  const commonOutput = [
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
    "-t",
    audioDuration.toFixed(3),
    "-c:v",
    "libx264",
    "-preset",
    env.FFMPEG_PRESET,
    "-crf",
    String(env.FFMPEG_CRF),
    "-threads",
    String(env.FFMPEG_THREADS),
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    "-c:a",
    "aac",
    "-b:a",
    env.OUTPUT_AUDIO_BITRATE,
    "-max_muxing_queue_size",
    "512",
    "-y",
    outputPath
  ];

  if (media1.kind === "image") {
    return [
      "-hide_banner",
      "-loglevel",
      "error",
      "-loop",
      "1",
      "-framerate",
      "30",
      "-i",
      media1.path,
      "-i",
      media2.path,
      "-vf",
      videoFilter,
      ...commonOutput
    ];
  }

  return [
    "-hide_banner",
    "-loglevel",
    "error",
    "-stream_loop",
    "-1",
    "-i",
    media1.path,
    "-i",
    media2.path,
    "-vf",
    videoFilter,
    ...commonOutput
  ];
}

export function buildVideoCopyArgs(media1: ClassifiedMedia, media2: ClassifiedMedia, outputPath: string): string[] {
  const audioDuration = media2.durationSeconds;
  if (!audioDuration || audioDuration <= 0) {
    throw new AppError(422, "AUDIO_DURATION_UNAVAILABLE", "The source audio duration could not be determined.");
  }

  return [
    "-hide_banner",
    "-loglevel",
    "error",
    "-stream_loop",
    "-1",
    "-i",
    media1.path,
    "-i",
    media2.path,
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
    "-t",
    audioDuration.toFixed(3),
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-b:a",
    env.OUTPUT_AUDIO_BITRATE,
    "-movflags",
    "+faststart",
    "-max_muxing_queue_size",
    "512",
    "-y",
    outputPath
  ];
}

async function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(env.FFMPEG_PATH, args, { windowsHide: true });
    let stderr = "";

    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
      if (stderr.length > 12000) stderr = stderr.slice(-12000);
    });
    child.on("error", (error) => {
      reject(new AppError(500, "FFMPEG_NOT_AVAILABLE", "FFmpeg is not available on the server.", error.message));
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new AppError(422, "FFMPEG_PROCESSING_FAILED", "FFmpeg could not merge the uploaded media.", {
        exitCode: code,
        stderr
      }));
    });
  });
}

export function outputFilename(jobId: string): string {
  return `merged-${jobId}.mp4`;
}

export function outputPathFor(workDir: string, jobId: string): string {
  return path.join(workDir, outputFilename(jobId));
}
