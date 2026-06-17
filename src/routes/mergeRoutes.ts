import { Router } from "express";
import { MergeController } from "../controllers/mergeController.js";
import { uploadMergeFiles } from "../middleware/upload.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();
const controller = new MergeController();

router.post("/merge", uploadMergeFiles, asyncHandler(controller.merge));

export { router as mergeRoutes };
