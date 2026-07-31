import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import multer from "multer";
import { sendError } from "../utils/response.js";
import logger from "../utils/logger.js";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Don't log stack for expected client errors
  const isClientError = (err as any).statusCode && (err as any).statusCode < 500;
  if (!isClientError) {
    logger.error("Unhandled error", { error: err.message, stack: err.stack });
  }

  // Zod validation errors
  if (err instanceof ZodError) {
    const errors = err.errors.map((e) => ({
      field: e.path.join("."),
      message: e.message,
    }));
    sendError(res, "Validation failed", 422, errors);
    return;
  }

  // Multer file upload errors
  if (err instanceof multer.MulterError) {
    switch (err.code) {
      case "LIMIT_FILE_SIZE":
        sendError(res, "File too large. Maximum size is 10MB", 413);
        return;
      case "LIMIT_UNEXPECTED_FILE":
        sendError(res, "Unexpected file field", 400);
        return;
      default:
        sendError(res, `File upload error: ${err.message}`, 400);
        return;
    }
  }

  // Prisma known request errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2002": {
        const target = (err.meta?.target as string[])?.join(", ") || "field";
        sendError(res, `Duplicate value for ${target}`, 409);
        return;
      }
      case "P2003":
        sendError(res, "Referenced record not found (foreign key constraint)", 400);
        return;
      case "P2025":
        sendError(res, "Record not found", 404);
        return;
      default:
        sendError(res, "Database error", 500);
        return;
    }
  }

  // Prisma validation errors (wrong field types, missing required fields)
  if (err instanceof Prisma.PrismaClientValidationError) {
    sendError(res, "Invalid data provided to database", 400);
    return;
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    sendError(res, "Invalid token", 401);
    return;
  }
  if (err.name === "TokenExpiredError") {
    sendError(res, "Token expired", 401);
    return;
  }

  // SyntaxError from malformed JSON body
  if (err instanceof SyntaxError && "body" in err) {
    sendError(res, "Invalid JSON in request body", 400);
    return;
  }

  // Custom errors with statusCode
  const statusCode = (err as any).statusCode || 500;
  const message =
    process.env.NODE_ENV === "production" && statusCode === 500
      ? "Internal server error"
      : err.message;

  sendError(res, message, statusCode);
}
