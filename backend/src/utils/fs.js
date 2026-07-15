import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { nanoid } from "nanoid";
import sanitize from "sanitize-filename";
import { env } from "../config/env.js";
import { ToolDependencyError } from "./errors.js";

const execFileAsync = promisify(execFile);

export async function makeWorkspace() {
  const jobId = nanoid(16);
  const dir = path.resolve(env.TMP_DIR, jobId);
  await fs.mkdir(dir, { recursive: true });
  return { jobId, dir };
}

export function safeName(name, fallback = "download") {
  const cleaned = sanitize(name || fallback).replace(/\s+/g, "-");
  return cleaned || fallback;
}

export async function cleanup(paths = []) {
  await Promise.all(
    paths.filter(Boolean).map((item) => fs.rm(item, { recursive: true, force: true }).catch(() => undefined))
  );
}

export async function findBinary(candidates) {
  for (const binary of candidates) {
    try {
      const { stdout } = await execFileAsync("sh", ["-lc", `command -v ${binary}`], { timeout: 5000 });
      const resolved = stdout.trim();
      if (resolved) return resolved;
    } catch {
      // try next candidate
    }
  }
  return null;
}

export async function assertBinary(binary, hint) {
  const resolved = await findBinary([binary]);
  if (!resolved) throw new ToolDependencyError(binary, hint);
  return resolved;
}

export async function runBinary(binary, args, options = {}) {
  const resolved = await assertBinary(binary, options.hint);
  const result = await execFileAsync(resolved, args, {
    timeout: options.timeout || 120000,
    maxBuffer: options.maxBuffer || 1024 * 1024 * 20,
    cwd: options.cwd
  });
  return result;
}

export async function fileSize(filePath) {
  const stat = await fs.stat(filePath);
  return stat.size;
}

export function exists(filePath) {
  return fsSync.existsSync(filePath);
}
