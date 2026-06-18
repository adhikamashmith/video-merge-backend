import path from "node:path";
import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  MAX_FILE_SIZE_MB: z.coerce.number().positive().default(50),
  UPLOAD_TTL_MINUTES: z.coerce.number().positive().default(10),
  FFMPEG_PATH: z.string().default("ffmpeg"),
  FFPROBE_PATH: z.string().default("ffprobe"),
  FFMPEG_THREADS: z.coerce.number().int().min(1).max(4).default(1),
  FFMPEG_PRESET: z.string().default("ultrafast"),
  FFMPEG_CRF: z.coerce.number().int().min(18).max(35).default(30),
  OUTPUT_MAX_HEIGHT: z.coerce.number().int().min(240).max(1080).default(720),
  OUTPUT_AUDIO_BITRATE: z.string().default("128k"),
  MEDIA_TMP_DIR: z.string().default(path.join(process.cwd(), "tmp"))
});

export const env = envSchema.parse(process.env);

export const corsOrigins = env.CORS_ORIGIN.split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

export const maxFileSizeBytes = Math.floor(env.MAX_FILE_SIZE_MB * 1024 * 1024);
export const uploadTtlMs = env.UPLOAD_TTL_MINUTES * 60 * 1000;
