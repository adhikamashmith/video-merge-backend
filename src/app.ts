import express from "express";
import cors from "cors";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { corsOrigins, env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { mergeRoutes } from "./routes/mergeRoutes.js";
import { healthRoutes } from "./routes/healthRoutes.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

export function createApp(): express.Express {
  const app = express();
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const frontendDist = path.resolve(__dirname, "../../frontend/dist");

  app.disable("x-powered-by");
  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || corsOrigins.includes(origin.replace(/\/$/, ""))) {
          callback(null, true);
          return;
        }

        callback(new Error(`Origin ${origin} is not allowed by CORS.`));
      },
      credentials: false
    })
  );
  app.use(pinoHttp({ logger }));
  app.use(express.json({ limit: "1mb" }));

  app.use("/api", healthRoutes);
  app.use("/api", mergeRoutes);

  if (env.NODE_ENV === "production" && fs.existsSync(path.join(frontendDist, "index.html"))) {
    app.use(express.static(frontendDist));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(frontendDist, "index.html"));
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
