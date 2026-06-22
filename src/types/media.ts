export type MediaKind = "image" | "video" | "audio";

export interface UploadedMedia {
  field: "media1" | "media2";
  originalName: string;
  mimeType: string;
  extension: string;
  size: number;
  path: string;
}

export interface ProbeStream {
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;
  duration?: string;
}

export interface ProbeFormat {
  duration?: string;
  format_name?: string;
}

export interface ProbeResult {
  streams: ProbeStream[];
  format: ProbeFormat;
}

export interface ClassifiedMedia extends UploadedMedia {
  kind: MediaKind;
  probe?: ProbeResult;
  durationSeconds?: number;
}

export interface MergeJob {
  id: string;
  media1: ClassifiedMedia[];
  media2: ClassifiedMedia;
  outputPath: string;
  workDir: string;
}

export interface MergeResult {
  id: string;
  outputPath: string;
  filename: string;
}
