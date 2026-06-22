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
    const primaryMedia = job.media1;

    if (primaryMedia.length === 1 && primaryMedia[0]?.kind === "video") {
      try {
        await runFfmpeg(buildVideoCopyArgs(primaryMedia[0], job.media2, job.outputPath));
        return;
      } catch {
        await runFfmpeg(buildMergeArgs(primaryMedia[0], job.media2, job.outputPath));
        return;
      }
    }

    await runFfmpeg(buildMergeArgs(primaryMedia, job.media2, job.outputPath));
  }
}

export function buildMergeArgs(
  media1Input: ClassifiedMedia | ClassifiedMedia[],
  media2: ClassifiedMedia,
  outputPath: string
): string[] {
  const media1 = Array.isArray(media1Input) ? media1Input : [media1Input];
  const audioDuration = media2.durationSeconds;
  if (!audioDuration || audioDuration <= 0) {
    throw new AppError(422, "AUDIO_DURATION_UNAVAILABLE", "The source audio duration could not be determined.");
  }

  const videoFilter = `scale=-2:min(${env.OUTPUT_MAX_HEIGHT}\\,ih):force_original_aspect_ratio=decrease,format=yuv420p`;
  const onlyPrimary = media1[0];

  if (media1.length > 1) {
    return buildVisualSequenceArgs(media1, media2, outputPath);
  }

  if (!onlyPrimary) {
    throw new AppError(400, "MISSING_PRIMARY_MEDIA", "At least one Input 1 file is required.");
  }

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

  if (onlyPrimary.kind === "image") {
    return [
      "-hide_banner",
      "-loglevel",
      "error",
      "-loop",
      "1",
      "-framerate",
      "30",
      "-i",
      onlyPrimary.path,
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
    onlyPrimary.path,
    "-i",
    media2.path,
    "-vf",
    videoFilter,
    ...commonOutput
  ];
}

export function buildVisualSequenceArgs(
  media1: ClassifiedMedia[],
  media2: ClassifiedMedia,
  outputPath: string
): string[] {
  const audioDuration = media2.durationSeconds;
  if (!audioDuration || audioDuration <= 0) {
    throw new AppError(422, "AUDIO_DURATION_UNAVAILABLE", "The source audio duration could not be determined.");
  }

  const sequenceDuration = media1.reduce((duration, media) => duration + visualDuration(media), 0);
  if (sequenceDuration <= 0) {
    throw new AppError(422, "PRIMARY_DURATION_UNAVAILABLE", "Could not determine the primary visual sequence duration.");
  }

  const repeatCount = Math.max(1, Math.ceil(audioDuration / sequenceDuration));
  const expanded = Array.from({ length: repeatCount }, () => media1).flat();
  const args = ["-hide_banner", "-loglevel", "error"];

  expanded.forEach((media) => {
    if (media.kind === "image") {
      args.push("-loop", "1", "-framerate", "30", "-t", env.IMAGE_DURATION_SECONDS.toFixed(3));
    }

    args.push("-i", media.path);
  });

  const audioInputIndex = expanded.length;
  args.push("-i", media2.path);

  const canvasHeight = env.OUTPUT_MAX_HEIGHT;
  const canvasWidth = Math.ceil(((canvasHeight * 16) / 9) / 2) * 2;
  const filterParts = expanded.map(
    (_media, index) =>
      `[${index}:v:0]scale=${canvasWidth}:${canvasHeight}:force_original_aspect_ratio=decrease,pad=${canvasWidth}:${canvasHeight}:(ow-iw)/2:(oh-ih)/2,fps=30,setsar=1,format=yuv420p[v${index}]`
  );
  const concatInputs = expanded.map((_media, index) => `[v${index}]`).join("");
  filterParts.push(`${concatInputs}concat=n=${expanded.length}:v=1:a=0[v]`);

  args.push(
    "-filter_complex",
    filterParts.join(";"),
    "-map",
    "[v]",
    "-map",
    `${audioInputIndex}:a:0`,
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
  );

  return args;
}

function visualDuration(media: ClassifiedMedia): number {
  if (media.kind === "image") return env.IMAGE_DURATION_SECONDS;
  return media.durationSeconds ?? 0;
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
