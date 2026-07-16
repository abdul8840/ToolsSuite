import { nanoid } from "nanoid";
import { ToolJob } from "../models/ToolJob.js";
import { cleanup, fileSize, safeName } from "../utils/fs.js";
import { parseOptions } from "../utils/options.js";
import { validateUploadedFiles } from "../middleware/upload.js";
import { hashIp } from "../middleware/security.js";
import { runTool, toolCatalog } from "../services/tools.js";
import { ValidationError } from "../utils/errors.js";
import { uploadToCloudinary } from "../services/cloudinary.js";

export async function listTools(_req, res) {
  res.json({ success: true, count: toolCatalog.length, tools: toolCatalog });
}

export async function getTool(req, res) {
  const tool = toolCatalog.find((item) => item.slug === req.params.slug);
  if (!tool) throw new ValidationError("Unknown tool slug.");
  res.json({ success: true, tool });
}

export async function runToolController(req, res, next) {
  const startedAt = Date.now();
  const uploadedFiles = Array.isArray(req.files) ? req.files : [];
  const auditJobId = nanoid(16);
  let jobDoc;
  let result;

  try {
    const slug = req.params.slug;
    const tool = toolCatalog.find((item) => item.slug === slug);
    if (!tool) throw new ValidationError("Unknown tool slug.");

    await validateUploadedFiles(uploadedFiles);
    const options = parseOptions(req.body.options);

    jobDoc = await ToolJob.create({
      jobId: auditJobId,
      slug,
      status: "started",
      inputCount: uploadedFiles.length,
      ipHash: hashIp(req.ip || "unknown"),
      userAgent: req.get("user-agent")
    }).catch(() => null);

    const inputAssets = await Promise.all(uploadedFiles.map(async (file) => {
      const asset = await uploadToCloudinary(file.path, { jobId: auditJobId, kind: "inputs", filename: file.originalname });
      return { publicId: asset.public_id, url: asset.secure_url, originalName: file.originalname };
    }));
    if (jobDoc) {
      jobDoc.inputAssets = inputAssets;
      await jobDoc.save().catch(() => undefined);
    }

    result = await runTool(slug, { files: uploadedFiles, options });
    const bytes = await fileSize(result.outPath);
    const outputAsset = await uploadToCloudinary(result.outPath, { jobId: auditJobId, kind: "results", filename: result.filename });

    if (jobDoc) {
      jobDoc.status = "success";
      jobDoc.outputName = result.filename;
      jobDoc.outputBytes = bytes;
      jobDoc.durationMs = Date.now() - startedAt;
      jobDoc.outputAsset = { publicId: outputAsset.public_id, url: outputAsset.secure_url };
      await jobDoc.save().catch(() => undefined);
    }

    const downloadName = safeName(result.filename, `${slug}-result`);
    res.setHeader("Content-Type", result.mimeType || "application/octet-stream");
    res.setHeader("X-Job-Id", result.jobId);
    res.download(result.outPath, downloadName, async (error) => {
      await cleanup([result.workDir, ...uploadedFiles.map((file) => file.path)]);
      if (error && !res.headersSent) next(error);
    });
  } catch (error) {
    if (jobDoc) {
      jobDoc.status = "failed";
      jobDoc.errorCode = error.code || "SERVER_ERROR";
      jobDoc.errorMessage = error.message;
      jobDoc.durationMs = Date.now() - startedAt;
      await jobDoc.save().catch(() => undefined);
    }
    const cleanupPaths = [...uploadedFiles.map((file) => file.path)];
    if (result?.workDir) cleanupPaths.push(result.workDir);
    await cleanup(cleanupPaths);
    next(error);
  }
}

export async function sitemap(req, res) {
  const origin = `${req.protocol}://${req.get("host")}`;
  const urls = ["/", "/tools", ...toolCatalog.map((tool) => `/tools/${tool.slug}`)];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((url) => `  <url><loc>${origin}${url}</loc><changefreq>weekly</changefreq><priority>${url === "/" ? "1.0" : "0.8"}</priority></url>`)
    .join("\n")}\n</urlset>`;
  res.type("application/xml").send(xml);
}

export async function robots(req, res) {
  const origin = `${req.protocol}://${req.get("host")}`;
  res.type("text/plain").send(`User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${origin}/sitemap.xml\n`);
}
