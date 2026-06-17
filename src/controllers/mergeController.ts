import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import type { Request, Response } from "express";
import { getMergeUploadPair } from "../validation/mediaValidation.js";
import { MergeService } from "../services/mergeService.js";
import { removePath } from "../utils/files.js";

export class MergeController {
  constructor(private readonly mergeService = new MergeService()) {}

  merge = async (req: Request, res: Response): Promise<void> => {
    const filesByField = req.files as Record<string, Express.Multer.File[]> | undefined;
    const flattenedFiles = Object.values(filesByField ?? {}).flat();
    const { media1, media2 } = getMergeUploadPair(flattenedFiles);

    const result = await this.mergeService.merge(media1, media2);
    const cleanupTargets = [...(req.tempUploadPaths ?? []), result.outputPath];
    const outputDir = path.dirname(result.outputPath);

    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);

    try {
      await pipeline(fs.createReadStream(result.outputPath), res);
    } finally {
      await Promise.all(cleanupTargets.map((target) => removePath(target)));
      await removePath(outputDir);
    }
  };
}
