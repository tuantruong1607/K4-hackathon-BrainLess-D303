import dotenv from "dotenv";

dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT || "8200", 10),

  DATABASE_URL: process.env.DATABASE_URL || "",

  SUPABASE_URL: process.env.SUPABASE_URL || "",
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || "",
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "",

  JWT_SECRET: process.env.JWT_SECRET || "fallback-secret",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "fallback-refresh-secret",
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || "30d",

  AGENT_BASE_URL: process.env.AGENT_BASE_URL || "http://localhost:8300",

  CORS_ORIGIN: process.env.CORS_ORIGIN?.split(",") || [
    "http://localhost:4173",
    "http://localhost:4175",
  ],

  UPLOAD_DIR: process.env.UPLOAD_DIR || "./uploads",
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || "10485760", 10),
} as const;

