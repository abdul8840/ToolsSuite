FROM node:20-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    chromium \
    ghostscript \
    libreoffice \
    poppler-utils \
    qpdf \
    tesseract-ocr \
    fonts-dejavu \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src

RUN mkdir -p /app/storage/tmp && chown -R node:node /app
USER node
EXPOSE 5000
CMD ["node", "src/server.js"]
