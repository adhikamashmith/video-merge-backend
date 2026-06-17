import type { ClassifiedMedia, MediaKind, ProbeResult, UploadedMedia } from "../types/media.js";
import { audioExtensions, imageExtensions, videoExtensions } from "../validation/mediaValidation.js";
import { AppError } from "../errors/AppError.js";
import { ProbeService } from "./probeService.js";

export class MediaClassifier {
  constructor(private readonly probeService = new ProbeService()) {}

  async classify(upload: UploadedMedia, allowedKinds: MediaKind[]): Promise<ClassifiedMedia> {
    const kind = extensionKind(upload.extension);

    if (!kind || !allowedKinds.includes(kind)) {
      throw new AppError(415, "UNSUPPORTED_MEDIA_TYPE", `Unsupported file type for ${upload.field}.`);
    }

    if (kind === "image") {
      return {
        ...upload,
        kind
      };
    }

    const probe = await this.probeService.probe(upload.path);
    validateProbeForKind(probe, kind, upload.field);

    return {
      ...upload,
      kind,
      probe,
      durationSeconds: extractDurationSeconds(probe)
    };
  }
}

export function extensionKind(extension: string): MediaKind | undefined {
  if (imageExtensions.has(extension)) return "image";
  if (videoExtensions.has(extension)) return "video";
  if (audioExtensions.has(extension)) return "audio";
  return undefined;
}

export function validateProbeForKind(probe: ProbeResult, kind: MediaKind, field: string): void {
  const hasAudio = probe.streams.some((stream) => stream.codec_type === "audio");
  const hasVideo = probe.streams.some((stream) => stream.codec_type === "video");

  if (kind === "audio" && !hasAudio) {
    throw new AppError(422, "AUDIO_STREAM_MISSING", `${field} does not contain a readable audio stream.`);
  }

  if (kind === "video" && !hasVideo) {
    throw new AppError(422, "VIDEO_STREAM_MISSING", `${field} does not contain a readable video stream.`);
  }

  if (field === "media2" && !hasAudio) {
    throw new AppError(422, "SOURCE_AUDIO_MISSING", "Input 2 must contain a readable audio stream.");
  }
}

export function extractDurationSeconds(probe: ProbeResult): number {
  const formatDuration = Number.parseFloat(probe.format.duration ?? "");
  if (Number.isFinite(formatDuration) && formatDuration > 0) return formatDuration;

  const streamDurations = probe.streams
    .map((stream) => Number.parseFloat(stream.duration ?? ""))
    .filter((duration) => Number.isFinite(duration) && duration > 0);

  const duration = Math.max(...streamDurations);
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new AppError(422, "DURATION_UNAVAILABLE", "Could not determine the source audio duration.");
  }

  return duration;
}
