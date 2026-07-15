# MERN Tools Suite

A full-stack, self-hosted tools website built with MongoDB, Express, React, and Node.js. It provides local APIs for file conversion, compression, PDF utilities, image utilities, OCR, QR generation, and more — without using third-party conversion APIs.

## Included tools

1. Image to PDF
2. PDF to Images
3. PDF to Word
4. Word to PDF
5. Background Remover
6. Compress PDF
7. Compress Word
8. Compress Image
9. Resize Image
10. Crop Image
11. Convert Image Format
12. Merge PDF
13. Split PDF
14. Rotate PDF
15. Add PDF Watermark
16. Protect PDF
17. Unlock PDF
18. Text to PDF
19. HTML to PDF
20. Word to Text
21. Image OCR
22. Image Metadata Viewer
23. Remove Image Metadata
24. QR Code Generator

## Architecture

- `backend/`: Express API, MongoDB job logging, local processing services, hardened upload handling.
- `frontend/`: React/Vite SEO-friendly marketing and tool UI.
- `docker-compose.yml`: MongoDB + API + web containers for production-like deployment.

## No third-party APIs

The app does not call external conversion APIs. It uses open-source local libraries and local system binaries. Some advanced operations require binaries installed inside the API container/server:

- `libreoffice`: Word to PDF
- `ghostscript`: PDF compression
- `qpdf`: protect/unlock PDFs
- `poppler-utils`: PDF to images
- `tesseract-ocr`: OCR
- `chromium`: HTML to PDF
- optional `rembg`: AI background removal (falls back to a local corner-color transparency algorithm)

## Quick start

```bash
cd mern-tools-suite
npm run install:all
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
npm run dev
```

API: `http://localhost:5000`  
Web: `http://localhost:5173`

## Production with Docker

```bash
cd mern-tools-suite
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
docker compose up --build -d
```

Web: `http://localhost:8080`

## Security features

- Strict upload size limit and file count limit
- MIME/extension allow-listing
- Per-IP rate limiting
- Helmet security headers
- CORS origin allow-list
- Request body limits
- Temporary workspace cleanup after download
- No public file execution paths
- MongoDB job audit log without permanent file storage
- Centralized error handling with safe production responses

## API usage

List tools:

```bash
curl http://localhost:5000/api/tools
```

Run a file tool:

```bash
curl -F "files=@sample.jpg" -F 'options={"quality":75}' \
  http://localhost:5000/api/tools/compress-image -OJ
```

Run a text tool:

```bash
curl -F 'options={"text":"Hello PDF"}' http://localhost:5000/api/tools/text-to-pdf -OJ
```

## Notes

This is a production-ready foundation. For very high traffic, add a queue worker (BullMQ/Redis), object storage, virus scanning, and horizontal scaling behind a reverse proxy.
