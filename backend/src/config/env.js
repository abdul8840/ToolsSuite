import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(5000),
  MONGODB_URI: z.string().min(1).default(process.env.MONGODB_URI || "mongodb://localhost:27017/file-upload"),
  CLIENT_ORIGIN: z.string().min(1).default("http://localhost:5173"),
  MAX_UPLOAD_MB: z.coerce.number().default(50),
  MAX_FILES: z.coerce.number().default(20),
  TMP_DIR: z.string().default("./storage/tmp"),
  PUBLIC_BASE_URL: z.string().default("http://localhost:5000")
});

export const env = envSchema.parse(process.env);
export const isProduction = env.NODE_ENV === "production";
export const corsOrigins = env.CLIENT_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean);
