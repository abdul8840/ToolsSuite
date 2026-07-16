import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";
import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";
import pdfParse from "pdf-parse";
import AdmZip from "adm-zip";
import QRCode from "qrcode";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { makeWorkspace, runBinary, assertBinary, findBinary } from "../utils/fs.js";
import { ValidationError } from "../utils/errors.js";
import { numberOption, stringOption } from "../utils/options.js";
import { zipDirectory } from "./archive.js";

const imageFormats = ["jpeg", "png", "webp", "avif", "tiff"];

function requireFiles(files, min = 1, message = "At least one file is required") {
  if (!files || files.length < min) throw new ValidationError(message);
}

function ext(file) {
  return path.extname(file.originalname || file.path).toLowerCase();
}

function requireExt(file, allowed) {
  const fileExt = ext(file);
  if (!allowed.includes(fileExt)) throw new ValidationError(`${file.originalname} must be ${allowed.join(" or ")}`);
}

async function copyPagesFrom(srcPdf, outPdf, indexes) {
  const pages = await outPdf.copyPages(srcPdf, indexes);
  pages.forEach((page) => outPdf.addPage(page));
}

async function savePdf(pdfDoc, outPath) {
  const bytes = await pdfDoc.save({ useObjectStreams: true });
  await fs.writeFile(outPath, bytes);
}

function output(outPath, filename, mimeType) {
  return { outPath, filename, mimeType };
}

async function simpleCornerBackgroundRemove(input, outPath, tolerance = 36) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const idx = (x, y) => (y * info.width + x) * info.channels;
  const corners = [idx(0, 0), idx(info.width - 1, 0), idx(0, info.height - 1), idx(info.width - 1, info.height - 1)];
  const bg = [0, 1, 2].map((c) => Math.round(corners.reduce((sum, start) => sum + data[start + c], 0) / corners.length));

  for (let i = 0; i < data.length; i += info.channels) {
    const dist = Math.sqrt((data[i] - bg[0]) ** 2 + (data[i + 1] - bg[1]) ** 2 + (data[i + 2] - bg[2]) ** 2);
    if (dist < tolerance) data[i + 3] = 0;
  }

  await sharp(data, { raw: info }).png().toFile(outPath);
}

async function aiBackgroundRemove(input, outPath) {
  const { removeBackground } = await import("@imgly/background-removal-node");
  const source = await fs.readFile(input);
  const result = await removeBackground(source, {
    model: "medium",
    output: { format: "image/png", quality: 1, type: "foreground" }
  });
  await fs.writeFile(outPath, Buffer.from(await result.arrayBuffer()));
}

async function rasterCompressPdf(inputPath, outPath, preset) {
  const { pdf: renderPdf } = await import("pdf-to-img");
  const settings = {
    screen: { scale: 1, quality: 42 },
    ebook: { scale: 1.35, quality: 58 },
    printer: { scale: 1.75, quality: 72 },
    prepress: { scale: 2, quality: 82 }
  }[preset];
  const sourcePdf = await PDFDocument.load(await fs.readFile(inputPath));
  const sourcePages = sourcePdf.getPages();
  const rendered = await renderPdf(inputPath, { scale: settings.scale });
  const compressed = await PDFDocument.create();
  let index = 0;
  try {
    for await (const png of rendered) {
      const jpegBytes = await sharp(png).jpeg({ quality: settings.quality, mozjpeg: true }).toBuffer();
      const image = await compressed.embedJpg(jpegBytes);
      const size = sourcePages[index]?.getSize() || { width: image.width, height: image.height };
      const page = compressed.addPage([size.width, size.height]);
      page.drawImage(image, { x: 0, y: 0, width: size.width, height: size.height });
      index += 1;
    }
  } finally {
    await rendered.destroy();
  }
  await savePdf(compressed, outPath);
}

export const toolCatalog = [
  { slug: "image-to-pdf", title: "Image to PDF", category: "PDF", accepts: ["image/*"], multiple: true, description: "Combine JPG, PNG, WebP, TIFF or BMP images into a single PDF." },
  { slug: "pdf-to-images", title: "PDF to Images", category: "PDF", accepts: ["application/pdf"], multiple: false, description: "Export every PDF page as PNG or JPEG images." },
  { slug: "pdf-to-word", title: "PDF to Word", category: "PDF", accepts: ["application/pdf"], multiple: false, description: "Extract PDF text into an editable DOCX document." },
  { slug: "word-to-pdf", title: "Word to PDF", category: "Documents", accepts: [".doc,.docx"], multiple: false, description: "Convert Word documents to PDF with local LibreOffice." },
  { slug: "bg-remover", title: "Background Remover", category: "Images", accepts: ["image/*"], multiple: false, description: "Remove image backgrounds with local AI and export a transparent PNG." },
  { slug: "compress-pdf", title: "Compress PDF", category: "Compression", accepts: ["application/pdf"], multiple: false, description: "Reduce PDF size using local Ghostscript." },
  { slug: "compress-word", title: "Compress Word", category: "Compression", accepts: [".docx"], multiple: false, description: "Repackage DOCX with maximum ZIP compression." },
  { slug: "compress-image", title: "Compress Image", category: "Compression", accepts: ["image/*"], multiple: false, description: "Compress JPG, PNG, WebP, AVIF or TIFF images." },
  { slug: "resize-image", title: "Resize Image", category: "Images", accepts: ["image/*"], multiple: false, description: "Resize image dimensions while preserving quality." },
  { slug: "crop-image", title: "Crop Image", category: "Images", accepts: ["image/*"], multiple: false, description: "Crop an image by x/y/width/height." },
  { slug: "convert-image", title: "Convert Image", category: "Images", accepts: ["image/*"], multiple: false, description: "Convert images to JPG, PNG, WebP, AVIF or TIFF." },
  { slug: "merge-pdf", title: "Merge PDF", category: "PDF", accepts: ["application/pdf"], multiple: true, description: "Merge multiple PDFs into one file." },
  { slug: "split-pdf", title: "Split PDF", category: "PDF", accepts: ["application/pdf"], multiple: false, description: "Split a PDF into one PDF per page." },
  { slug: "rotate-pdf", title: "Rotate PDF", category: "PDF", accepts: ["application/pdf"], multiple: false, description: "Rotate all PDF pages by 90, 180 or 270 degrees." },
  { slug: "watermark-pdf", title: "Watermark PDF", category: "PDF", accepts: ["application/pdf"], multiple: false, description: "Stamp text watermark over every PDF page." },
  { slug: "protect-pdf", title: "Protect PDF", category: "PDF", accepts: ["application/pdf"], multiple: false, description: "Encrypt a PDF with a password using local qpdf." },
  { slug: "unlock-pdf", title: "Unlock PDF", category: "PDF", accepts: ["application/pdf"], multiple: false, description: "Remove PDF password when you know it, using local qpdf." },
  { slug: "text-to-pdf", title: "Text to PDF", category: "PDF", accepts: [], multiple: false, description: "Create a PDF from pasted text." },
  { slug: "html-to-pdf", title: "HTML to PDF", category: "PDF", accepts: [".html,.htm"], multiple: false, description: "Render HTML into PDF using local Chromium." },
  { slug: "word-to-text", title: "Word to Text", category: "Documents", accepts: [".docx"], multiple: false, description: "Extract raw text from DOCX." },
  { slug: "image-ocr", title: "Image OCR", category: "Images", accepts: ["image/*"], multiple: false, description: "Extract text from an image using local Tesseract." },
  { slug: "image-metadata", title: "Image Metadata", category: "Images", accepts: ["image/*"], multiple: false, description: "View image metadata as JSON." },
  { slug: "remove-image-metadata", title: "Remove Image Metadata", category: "Privacy", accepts: ["image/*"], multiple: false, description: "Strip image metadata by re-encoding pixels." },
  { slug: "qr-code", title: "QR Code Generator", category: "Utilities", accepts: [], multiple: false, description: "Generate QR codes locally." }
];

export const toolHandlers = {
  async "image-to-pdf"({ files, workDir }) {
    requireFiles(files);
    const pdf = await PDFDocument.create();
    for (const file of files) {
      const normalized = path.join(workDir, `${crypto.randomUUID()}.png`);
      await sharp(file.path).rotate().png().toFile(normalized);
      const imageBytes = await fs.readFile(normalized);
      const image = await pdf.embedPng(imageBytes);
      const page = pdf.addPage([image.width, image.height]);
      page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
    }
    const outPath = path.join(workDir, "images.pdf");
    await savePdf(pdf, outPath);
    return output(outPath, "images.pdf", "application/pdf");
  },

  async "pdf-to-images"({ files, options, workDir }) {
    requireFiles(files, 1); requireExt(files[0], [".pdf"]);
    const format = stringOption(options, "format", "png", ["png", "jpeg"]);
    const dpi = numberOption(options, "dpi", 150, 72, 400);
    const imageDir = path.join(workDir, "pages");
    await fs.mkdir(imageDir, { recursive: true });
    const prefix = path.join(imageDir, "page");
    await runBinary("pdftoppm", [format === "png" ? "-png" : "-jpeg", "-r", String(dpi), files[0].path, prefix], { hint: "Install poppler-utils.", timeout: 180000 });
    const zipPath = path.join(workDir, "pdf-pages.zip");
    await zipDirectory(imageDir, zipPath);
    return output(zipPath, "pdf-pages.zip", "application/zip");
  },

  async "pdf-to-word"({ files, workDir }) {
    requireFiles(files, 1); requireExt(files[0], [".pdf"]);
    const buffer = await fs.readFile(files[0].path);
    const parsed = await pdfParse(buffer);
    const paragraphs = parsed.text.split(/\n{2,}/).filter(Boolean).map((text) => new Paragraph({ children: [new TextRun(text.trim())] }));
    const doc = new Document({ sections: [{ properties: {}, children: paragraphs.length ? paragraphs : [new Paragraph("")] }] });
    const outPath = path.join(workDir, "converted.docx");
    await fs.writeFile(outPath, await Packer.toBuffer(doc));
    return output(outPath, "converted.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  },

  async "word-to-pdf"({ files, workDir }) {
    requireFiles(files, 1); requireExt(files[0], [".doc", ".docx"]);
    await runBinary("libreoffice", ["--headless", "--convert-to", "pdf", "--outdir", workDir, files[0].path], { hint: "Install LibreOffice.", timeout: 180000 });
    const generated = (await fs.readdir(workDir)).find((name) => name.toLowerCase().endsWith(".pdf"));
    if (!generated) throw new ValidationError("LibreOffice did not produce a PDF.");
    return output(path.join(workDir, generated), "document.pdf", "application/pdf");
  },

  async "bg-remover"({ files, options, workDir }) {
    requireFiles(files, 1);
    const outPath = path.join(workDir, "background-removed.png");
    const tolerance = numberOption(options, "tolerance", 36, 1, 160);
    try {
      const rembg = await findBinary(["rembg"]);
      if (rembg) await runBinary(rembg, ["i", files[0].path, outPath], { timeout: 240000 });
      else await aiBackgroundRemove(files[0].path, outPath);
    } catch (error) {
      try {
        await simpleCornerBackgroundRemove(files[0].path, outPath, tolerance);
      } catch {
        throw error;
      }
    }
    await sharp(outPath).ensureAlpha().png({ compressionLevel: 9 }).toFile(`${outPath}.png`);
    await fs.rename(`${outPath}.png`, outPath);
    return output(outPath, "background-removed.png", "image/png");
  },

  async "compress-pdf"({ files, options, workDir }) {
    requireFiles(files, 1); requireExt(files[0], [".pdf"]);
    const preset = stringOption(options, "preset", "ebook", ["screen", "ebook", "printer", "prepress"]);
    const outPath = path.join(workDir, "compressed.pdf");
    const ghostscript = await findBinary(process.platform === "win32" ? ["gswin64c", "gswin32c", "gs"] : ["gs"]);
    if (ghostscript) {
      await runBinary(ghostscript, ["-sDEVICE=pdfwrite", "-dCompatibilityLevel=1.4", `-dPDFSETTINGS=/${preset}`, "-dNOPAUSE", "-dQUIET", "-dBATCH", `-sOutputFile=${outPath}`, files[0].path], { hint: "Install Ghostscript.", timeout: 180000 });
    } else {
      await rasterCompressPdf(files[0].path, outPath, preset);
    }
    return output(outPath, "compressed.pdf", "application/pdf");
  },

  async "compress-word"({ files, workDir }) {
    requireFiles(files, 1); requireExt(files[0], [".docx"]);
    const zip = new AdmZip(files[0].path);
    const outPath = path.join(workDir, "compressed.docx");
    for (const entry of zip.getEntries().filter((item) => /^word\/media\//i.test(item.entryName))) {
      const extension = path.extname(entry.entryName).toLowerCase();
      if (![".jpg", ".jpeg", ".png"].includes(extension)) continue;
      const pipeline = sharp(entry.getData()).rotate().resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true });
      const optimized = extension === ".png"
        ? await pipeline.png({ compressionLevel: 9, palette: true, quality: 75 }).toBuffer()
        : await pipeline.jpeg({ quality: 68, mozjpeg: true }).toBuffer();
      if (optimized.length < entry.header.size) zip.updateFile(entry.entryName, optimized);
    }
    zip.writeZip(outPath);
    return output(outPath, "compressed.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  },

  async "compress-image"({ files, options, workDir }) {
    requireFiles(files, 1);
    const quality = numberOption(options, "quality", 75, 1, 100);
    const format = stringOption(options, "format", "webp", imageFormats);
    const outPath = path.join(workDir, `compressed.${format === "jpeg" ? "jpg" : format}`);
    await sharp(files[0].path).rotate().toFormat(format, { quality, effort: 6 }).toFile(outPath);
    return output(outPath, path.basename(outPath), `image/${format}`);
  },

  async "resize-image"({ files, options, workDir }) {
    requireFiles(files, 1);
    const width = numberOption(options, "width", 1200, 1, 12000);
    const heightRaw = options.height === undefined || options.height === "" ? null : numberOption(options, "height", 800, 1, 12000);
    const fit = stringOption(options, "fit", "inside", ["cover", "contain", "fill", "inside", "outside"]);
    const format = stringOption(options, "format", "webp", imageFormats);
    const outPath = path.join(workDir, `resized.${format === "jpeg" ? "jpg" : format}`);
    await sharp(files[0].path).rotate().resize({ width, height: heightRaw, fit, withoutEnlargement: true }).toFormat(format, { quality: 85 }).toFile(outPath);
    return output(outPath, path.basename(outPath), `image/${format}`);
  },

  async "crop-image"({ files, options, workDir }) {
    requireFiles(files, 1);
    const left = numberOption(options, "left", 0, 0, 12000);
    const top = numberOption(options, "top", 0, 0, 12000);
    const width = numberOption(options, "width", 400, 1, 12000);
    const height = numberOption(options, "height", 400, 1, 12000);
    const outPath = path.join(workDir, "cropped.png");
    await sharp(files[0].path).rotate().extract({ left, top, width, height }).png().toFile(outPath);
    return output(outPath, "cropped.png", "image/png");
  },

  async "convert-image"({ files, options, workDir }) {
    requireFiles(files, 1);
    const format = stringOption(options, "format", "png", imageFormats);
    const quality = numberOption(options, "quality", 85, 1, 100);
    const outPath = path.join(workDir, `converted.${format === "jpeg" ? "jpg" : format}`);
    await sharp(files[0].path).rotate().toFormat(format, { quality }).toFile(outPath);
    return output(outPath, path.basename(outPath), `image/${format}`);
  },

  async "merge-pdf"({ files, workDir }) {
    requireFiles(files, 2, "Upload at least two PDFs to merge.");
    const outPdf = await PDFDocument.create();
    for (const file of files) {
      requireExt(file, [".pdf"]);
      const src = await PDFDocument.load(await fs.readFile(file.path), { ignoreEncryption: false });
      await copyPagesFrom(src, outPdf, src.getPageIndices());
    }
    const outPath = path.join(workDir, "merged.pdf");
    await savePdf(outPdf, outPath);
    return output(outPath, "merged.pdf", "application/pdf");
  },

  async "split-pdf"({ files, workDir }) {
    requireFiles(files, 1); requireExt(files[0], [".pdf"]);
    const src = await PDFDocument.load(await fs.readFile(files[0].path));
    const pagesDir = path.join(workDir, "split-pages");
    await fs.mkdir(pagesDir, { recursive: true });
    for (const index of src.getPageIndices()) {
      const out = await PDFDocument.create();
      await copyPagesFrom(src, out, [index]);
      await savePdf(out, path.join(pagesDir, `page-${index + 1}.pdf`));
    }
    const zipPath = path.join(workDir, "split-pdf.zip");
    await zipDirectory(pagesDir, zipPath);
    return output(zipPath, "split-pdf.zip", "application/zip");
  },

  async "rotate-pdf"({ files, options, workDir }) {
    requireFiles(files, 1); requireExt(files[0], [".pdf"]);
    const angle = numberOption(options, "angle", 90, 0, 360);
    if (![0, 90, 180, 270, 360].includes(angle)) throw new ValidationError("Angle must be 0, 90, 180, 270 or 360");
    const pdf = await PDFDocument.load(await fs.readFile(files[0].path));
    pdf.getPages().forEach((page) => page.setRotation(degrees((page.getRotation().angle + angle) % 360)));
    const outPath = path.join(workDir, "rotated.pdf");
    await savePdf(pdf, outPath);
    return output(outPath, "rotated.pdf", "application/pdf");
  },

  async "watermark-pdf"({ files, options, workDir }) {
    requireFiles(files, 1); requireExt(files[0], [".pdf"]);
    const text = (options.text || "CONFIDENTIAL").toString().slice(0, 80);
    const opacity = numberOption(options, "opacity", 0.25, 0.05, 1);
    const size = numberOption(options, "size", 52, 8, 120);
    const pdf = await PDFDocument.load(await fs.readFile(files[0].path));
    const font = await pdf.embedFont(StandardFonts.HelveticaBold);
    pdf.getPages().forEach((page) => {
      const { width, height } = page.getSize();
      page.drawText(text, { x: width * 0.15, y: height * 0.48, size, font, color: rgb(0.8, 0.1, 0.1), opacity, rotate: degrees(-35) });
    });
    const outPath = path.join(workDir, "watermarked.pdf");
    await savePdf(pdf, outPath);
    return output(outPath, "watermarked.pdf", "application/pdf");
  },

  async "protect-pdf"({ files, options, workDir }) {
    requireFiles(files, 1); requireExt(files[0], [".pdf"]);
    const password = (options.password || "").toString();
    if (password.length < 6) throw new ValidationError("Password must be at least 6 characters.");
    const outPath = path.join(workDir, "protected.pdf");
    await runBinary("qpdf", ["--encrypt", password, password, "256", "--", files[0].path, outPath], { hint: "Install qpdf.", timeout: 120000 });
    return output(outPath, "protected.pdf", "application/pdf");
  },

  async "unlock-pdf"({ files, options, workDir }) {
    requireFiles(files, 1); requireExt(files[0], [".pdf"]);
    const password = (options.password || "").toString();
    const outPath = path.join(workDir, "unlocked.pdf");
    await runBinary("qpdf", [`--password=${password}`, "--decrypt", files[0].path, outPath], { hint: "Install qpdf.", timeout: 120000 });
    return output(outPath, "unlocked.pdf", "application/pdf");
  },

  async "text-to-pdf"({ options, workDir }) {
    const text = (options.text || "").toString();
    if (!text.trim()) throw new ValidationError("Text is required.");
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const fontSize = 12;
    const margin = 50;
    const lineHeight = 16;
    const words = text.replace(/\r/g, "").split(/\s+/);
    let page = pdf.addPage();
    let { width, height } = page.getSize();
    let x = margin;
    let y = height - margin;
    let line = "";
    const drawLine = (value) => { page.drawText(value, { x, y, size: fontSize, font, color: rgb(0, 0, 0) }); y -= lineHeight; };
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, fontSize) > width - margin * 2) {
        drawLine(line);
        line = word;
        if (y < margin) { page = pdf.addPage(); ({ width, height } = page.getSize()); y = height - margin; }
      } else line = next;
    }
    if (line) drawLine(line);
    const outPath = path.join(workDir, "text.pdf");
    await savePdf(pdf, outPath);
    return output(outPath, "text.pdf", "application/pdf");
  },

  async "html-to-pdf"({ files, options, workDir }) {
    const htmlPath = files?.[0]?.path || path.join(workDir, "input.html");
    if (!files?.[0]) {
      const html = (options.html || "").toString();
      if (!html.trim()) throw new ValidationError("Upload HTML or provide html option.");
      await fs.writeFile(htmlPath, html, "utf8");
    }
    const outPath = path.join(workDir, "page.pdf");
    const chromium = await findBinary(["chromium", "chromium-browser", "google-chrome"]);
    if (!chromium) await assertBinary("chromium", "Install chromium, chromium-browser or google-chrome.");
    await runBinary(chromium || "chromium", ["--headless", "--disable-gpu", "--no-sandbox", `--print-to-pdf=${outPath}`, `file://${path.resolve(htmlPath)}`], { hint: "Install Chromium.", timeout: 120000 });
    return output(outPath, "page.pdf", "application/pdf");
  },

  async "word-to-text"({ files, workDir }) {
    requireFiles(files, 1); requireExt(files[0], [".docx"]);
    const mammothModule = await import("mammoth").catch(() => null);
    const mammoth = mammothModule?.default || mammothModule;
    if (!mammoth?.extractRawText) throw new ValidationError("mammoth package missing.");
    const result = await mammoth.extractRawText({ path: files[0].path });
    const outPath = path.join(workDir, "document.txt");
    await fs.writeFile(outPath, result.value, "utf8");
    return output(outPath, "document.txt", "text/plain");
  },

  async "image-ocr"({ files, options, workDir }) {
    requireFiles(files, 1);
    const lang = (options.lang || "eng").toString().replace(/[^a-zA-Z_+]/g, "").slice(0, 32) || "eng";
    const prefix = path.join(workDir, "ocr");
    await runBinary("tesseract", [files[0].path, prefix, "-l", lang], { hint: "Install tesseract-ocr and language packs.", timeout: 180000 });
    return output(`${prefix}.txt`, "ocr.txt", "text/plain");
  },

  async "image-metadata"({ files, workDir }) {
    requireFiles(files, 1);
    const metadata = await sharp(files[0].path).metadata();
    const outPath = path.join(workDir, "metadata.json");
    await fs.writeFile(outPath, JSON.stringify(metadata, null, 2), "utf8");
    return output(outPath, "metadata.json", "application/json");
  },

  async "remove-image-metadata"({ files, options, workDir }) {
    requireFiles(files, 1);
    const format = stringOption(options, "format", "jpeg", imageFormats);
    const outPath = path.join(workDir, `clean.${format === "jpeg" ? "jpg" : format}`);
    await sharp(files[0].path).rotate().toFormat(format, { quality: 90 }).toFile(outPath);
    return output(outPath, path.basename(outPath), `image/${format}`);
  },

  async "qr-code"({ options, workDir }) {
    const text = (options.text || "").toString();
    if (!text.trim()) throw new ValidationError("QR text or URL is required.");
    const size = numberOption(options, "size", 512, 128, 2048);
    const outPath = path.join(workDir, "qr-code.png");
    await QRCode.toFile(outPath, text, { width: size, margin: 2, errorCorrectionLevel: "M" });
    return output(outPath, "qr-code.png", "image/png");
  }
};

export async function runTool(slug, payload) {
  const handler = toolHandlers[slug];
  if (!handler) throw new ValidationError("Unknown tool slug.");
  const workspace = await makeWorkspace();
  const result = await handler({ ...payload, workDir: workspace.dir, jobId: workspace.jobId });
  return { ...result, jobId: workspace.jobId, workDir: workspace.dir };
}
