import type { Express } from "express";
import { AppError } from "../errors/AppError.js";
import type { UploadedMedia } from "../types/media.js";
import { safeExt } from "../utils/files.js";

export const imageExtensions = new Set(["jpg", "jpeg", "png", "webp"]);
export const videoExtensions = new Set(["mp4", "mov", "mkv", "webm"]);
export const audioExtensions = new Set(["mp3", "wav", "aac", "m4a", "ogg"]);

export function normalizeUploadedFiles(files: Express.Multer.File[] | undefined): UploadedMedia[] {
  if (!files) return [];

  return files.map((file) => ({
    field: file.fieldname as "media1" | "media2",
    originalName: file.originalname,
    mimeType: file.mimetype,
    extension: safeExt(file.originalname),
    size: file.size,
    path: file.path
  }));
}

export function getMergeUploadPair(files: Express.Multer.File[] | undefined): {
  media1: UploadedMedia[];
  media2: UploadedMedia;
} {
  const normalized = normalizeUploadedFiles(files);
  const media1 = normalized.filter((file) => file.field === "media1");
  const media2 = normalized.find((file) => file.field === "media2");

  if (media1.length === 0 || !media2) {
    throw new AppError(400, "MISSING_FILES", "At least one Input 1 file and one Input 2 file are required.");
  }

  const invalidPrimary = media1.find((file) => !isAllowedPrimaryExtension(file.extension));
  if (invalidPrimary) {
    throw new AppError(415, "INVALID_MEDIA1_FORMAT", "Primary media must be jpg, jpeg, png, webp, mp4, mov, mkv, or webm.");
  }

  if (!isAllowedAudioSourceExtension(media2.extension)) {
    throw new AppError(415, "INVALID_MEDIA2_FORMAT", "Audio source must be mp3, wav, aac, m4a, ogg, mp4, mov, mkv, or webm.");
  }

  return { media1, media2 };
}

export function isAllowedPrimaryExtension(extension: string): boolean {
  return imageExtensions.has(extension) || videoExtensions.has(extension);
}

export function isAllowedAudioSourceExtension(extension: string): boolean {
  return audioExtensions.has(extension) || videoExtensions.has(extension);
}
