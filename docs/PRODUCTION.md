# Production hardening checklist

## Infrastructure

- Put the `web` container behind Cloudflare/Nginx/ALB with HTTPS.
- Keep `api` and `mongo` private; expose only the web proxy.
- Set `CLIENT_ORIGIN` to your real HTTPS domain.
- Configure the Cloudinary credentials and a dedicated `CLOUDINARY_FOLDER`.
- Keep `TMP_DIR` ephemeral (the Docker configuration uses `tmpfs`).
- Use MongoDB auth in real deployments.

## File processing

This project intentionally uses local libraries/binaries, not third-party APIs. Install or keep these binaries in the API image:

- LibreOffice for Word/PDF conversions
- Ghostscript for PDF compression
- qpdf for PDF encryption/decryption
- Poppler for PDF page rendering
- Tesseract for OCR
- Chromium for HTML rendering

## Scaling

The API currently processes requests synchronously and streams the output. For heavy public traffic:

1. Move processing into worker jobs.
2. Add Redis/BullMQ.
3. Configure Cloudinary authenticated delivery if processed files must be private.
4. Add ClamAV scanning for uploaded files.
5. Add user accounts and quotas if needed.

## SEO

- React Helmet sets per-page metadata.
- API serves `/sitemap.xml` and `/robots.txt`.
- For maximum SEO at scale, add SSR/prerendering or generate static pages for tool landing pages.
