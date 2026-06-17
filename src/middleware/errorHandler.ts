import type { ErrorRequestHandler, RequestHandler } from "express";
import multer from "multer";
import { ZodError } from "zod";
import { AppError, isOperationalError } from "../errors/AppError.js";
import { logger } from "../config/logger.js";
import { removePath } from "../utils/files.js";

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(new AppError(404, "NOT_FOUND", "The requested route was not found."));
};

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  if (req.tempUploadPaths) {
    void Promise.all(req.tempUploadPaths.map((filePath) => removePath(filePath)));
  }

  if (error instanceof multer.MulterError) {
    const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    res.status(status).json({
      error: {
        code: error.code,
        message: error.message
      }
    });
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "The request payload is invalid.",
        details: error.flatten()
      }
    });
    return;
  }

  if (isOperationalError(error)) {
    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    });
    return;
  }

  logger.error({ error }, "Unhandled request error");
  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected server error occurred."
    }
  });
};
