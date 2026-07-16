import fs from "fs";
import path from "path";
import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env.js";
import { AppError } from "../utils/errors.js";
import { safeName } from "../utils/fs.js";

const configured = Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
let folderPromise;

if (configured) cloudinary.config({ cloud_name: env.CLOUDINARY_CLOUD_NAME, api_key: env.CLOUDINARY_API_KEY, api_secret: env.CLOUDINARY_API_SECRET, secure: true });

function assertConfigured() {
  if (!configured) throw new AppError("Cloudinary storage is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.", 503, "STORAGE_NOT_CONFIGURED");
}

export function ensureCloudinaryFolder() {
  assertConfigured();
  folderPromise ||= cloudinary.api.create_folder(env.CLOUDINARY_FOLDER).catch((error) => {
    if (error?.http_code === 409) return { path: env.CLOUDINARY_FOLDER };
    folderPromise = undefined;
    throw error;
  });
  return folderPromise;
}

export async function uploadToCloudinary(filePath, { jobId, kind, filename }) {
  await ensureCloudinaryFolder();
  const cleanFilename = safeName(filename || path.basename(filePath));
  const publicId = `${env.CLOUDINARY_FOLDER}/${kind}/${jobId}/${cleanFilename}`;
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ public_id: publicId, resource_type: "auto", overwrite: false, use_filename: false }, (error, result) => error ? reject(error) : resolve(result));
    fs.createReadStream(filePath).on("error", reject).pipe(stream);
  });
}

export function cloudinaryStatus() {
  return { configured, folder: env.CLOUDINARY_FOLDER };
}
