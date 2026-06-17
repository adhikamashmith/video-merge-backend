import path from "node:path";
import { nanoid } from "nanoid";
import { env } from "../config/env.js";
import type { MergeResult, UploadedMedia } from "../types/media.js";
import { ensureDir, removePath } from "../utils/files.js";
import { MediaClassifier } from "./mediaClassifier.js";
import { FfmpegService, outputFilename, outputPathFor } from "./ffmpegService.js";

export class MergeService {
  constructor(
    private readonly classifier = new MediaClassifier(),
    private readonly ffmpeg = new FfmpegService()
  ) {}

  async merge(media1Upload: UploadedMedia, media2Upload: UploadedMedia): Promise<MergeResult> {
    const id = nanoid();
    const workDir = path.join(env.MEDIA_TMP_DIR, "jobs", id);
    await ensureDir(workDir);

    try {
      const [media1, media2] = await Promise.all([
        this.classifier.classify(media1Upload, ["image", "video"]),
        this.classifier.classify(media2Upload, ["audio", "video"])
      ]);

      const outputPath = outputPathFor(workDir, id);
      await this.ffmpeg.merge({ id, media1, media2, outputPath, workDir });

      return {
        id,
        outputPath,
        filename: outputFilename(id)
      };
    } catch (error) {
      await removePath(workDir);
      throw error;
    }
  }
}
