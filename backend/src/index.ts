import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import fs from "fs";
import { env } from "./config/env.js";
import { corsOptions } from "./config/cors.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { generalLimiter } from "./middleware/rateLimiter.js";
import routes from "./routes/index.js";
import logger from "./utils/logger.js";

const app = express();

app.disable('etag'); // Thêm dòng này để tắt cache ETag
// Security middleware
app.use(helmet());
app.use(cors(corsOptions));
app.use(generalLimiter);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// HTTP logging
app.use(
  morgan("dev", {
    stream: { write: (message: string) => logger.info(message.trim()) },
  })
);

// Ensure uploads directory exists
const uploadsDir = path.resolve(env.UPLOAD_DIR);
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded files
app.use("/uploads", express.static(uploadsDir));

// Health check
app.get("/health", (_req, res) => {
  res.json({
    success: true,
    message: "VLearn Backend API is running",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// API routes
app.use("/api", routes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    statusCode: 404,
  });
});

// Global error handler
app.use(errorHandler);

// Start server
app.listen(env.PORT, () => {
  logger.info(`🚀 VLearn Backend API running on http://localhost:${env.PORT}`);
  logger.info(`📚 Environment: ${env.NODE_ENV}`);
  logger.info(`🔗 Agent service: ${env.AGENT_BASE_URL}`);
});

export default app;
