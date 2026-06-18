import express from "express";
import cors from "cors";
import helmet from "helmet";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { logger } from "./config/logger.js";
import { mergeRoutes } from "./routes/mergeRoutes.js";
import { healthRoutes } from "./routes/healthRoutes.js";
import {
  errorHandler,
  notFoundHandler,
} from "./middleware/errorHandler.js";

export function createApp(): express.Express {
  const app = express();

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const frontendDist = path.resolve(__dirname, "../../frontend/dist");

  // ❌ remove express header
  app.disable("x-powered-by");

  // 🔒 Helmet (safe for uploads + videos)
  app.use(
    helmet({
      crossOriginResourcePolicy: false,
    })
  );

  // 🌍 CORS (ALLOW ALL - for debugging/deploy fix)
  app.use(
    cors({
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    })
  );


  // ⚠️ IMPORTANT: increase payload limits (VERY IMPORTANT for video upload)
  app.use(express.json({ limit: "500mb" }));
  app.use(express.urlencoded({ extended: true, limit: "500mb" }));

  // 🚨 NOTE:
  // If you upload FILES (videos/images), you MUST use multer in routes
  // express.json DOES NOT handle files

  // routes
  app.use("/api", healthRoutes);
  app.use("/api", mergeRoutes);

  // 🌐 serve frontend (optional if same backend)
  if (fs.existsSync(path.join(frontendDist, "index.html"))) {
    app.use(express.static(frontendDist));

    app.get("*", (_req, res) => {
      res.sendFile(path.join(frontendDist, "index.html"));
    });
  }

  // ❌ 404 handler
  app.use(notFoundHandler);

  // ❌ global error handler (IMPORTANT FIX)
  app.use(errorHandler);

  return app;
}