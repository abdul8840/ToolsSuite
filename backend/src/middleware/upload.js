import fs from "fs/promises";
import path from "path";
import multer from "multer";
import { fileTypeFromFile } from "file-type";
import { env } from "../config/env.js";
import { ValidationError } from "../utils/errors.js";

await fs.mkdir(env.TMP_DIR, { recursive: true });

const allowedExtensions = new Set([
  ".pdf", ".doc", ".docx", ".txt", ".html", ".htm",
  ".png", ".jpg", ".jpeg", ".webp", ".tiff", ".tif", ".gif", ".bmp", ".svg"
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, env.TMP_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  }
});

export const upload = multer({
  storage,
  limits: {
    fileSize: env.MAX_UPLOAD_MB * 1024 * 1024,
    files: env.MAX_FILES,
    fields: 20
  },
  fileFilter(_req, file, cb) {
    const ext = path.extname(file.originalname || "").toLowerCase();
    if (!allowedExtensions.has(ext)) return cb(new ValidationError(`File extension ${ext || "unknown"} is not allowed.`));
    cb(null, true);
  }
});

export async function validateUploadedFiles(files = []) {
  for (const file of files) {
    const ext = path.extname(file.originalname || file.path).toLowerCase();
    const detected = await fileTypeFromFile(file.path).catch(() => null);

    const isOffice = [".doc", ".docx"].includes(ext);
    const isText = [".txt", ".html", ".htm", ".svg"].includes(ext);
    if (!detected && !isOffice && !isText) {
      throw new ValidationError(`Could not verify file type for ${file.originalname}.`);
    }
  }
}
