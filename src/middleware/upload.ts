import path from "node:path";
import multer from "multer";
import { nanoid } from "nanoid";
import { env, maxFileSizeBytes } from "../config/env.js";
import { ensureDir, safeExt } from "../utils/files.js";

const uploadRoot = path.join(env.MEDIA_TMP_DIR, "uploads");
void ensureDir(uploadRoot);

const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    try {
      await ensureDir(uploadRoot);
      cb(null, uploadRoot);
    } catch (error) {
      cb(error as Error, uploadRoot);
    }
  },
  filename: (req, file, cb) => {
    const ext = safeExt(file.originalname);
    const name = `${Date.now()}-${nanoid()}${ext ? `.${ext}` : ""}`;
    req.tempUploadPaths = [...(req.tempUploadPaths ?? []), path.join(uploadRoot, name)];
    cb(null, name);
  }
});

export const uploadMergeFiles = multer({
  storage,
  limits: {
    fileSize: maxFileSizeBytes,
    files: 11
  }
}).fields([
  { name: "media1", maxCount: 10 },
  { name: "media2", maxCount: 1 }
]);
