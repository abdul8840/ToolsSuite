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
  PUBLIC_BASE_URL: z.string().default("http://localhost:5000"),
  SITE_URL: z.string().url().default("http://localhost:5173"),
  CLOUDINARY_CLOUD_NAME: z.string().min(1).optional(process.env.CLOUDINARY_CLOUD_NAME ? { message: "CLOUDINARY_CLOUD_NAME is required when using Cloudinary" } : undefined),
  CLOUDINARY_API_KEY: z.string().min(1).optional(process.env.CLOUDINARY_API_KEY ? { message: "CLOUDINARY_API_KEY is required when using Cloudinary" } : undefined),
  CLOUDINARY_API_SECRET: z.string().min(1).optional(process.env.CLOUDINARY_API_SECRET ? { message: "CLOUDINARY_API_SECRET is required when using Cloudinary" } : undefined),
  CLOUDINARY_FOLDER: z.string().min(1).default(process.env.CLOUDINARY_FOLDER || "tools-suite"),
});

export const env = envSchema.parse(process.env);
export const isProduction = env.NODE_ENV === "production";
export const corsOrigins = env.CLIENT_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean);
