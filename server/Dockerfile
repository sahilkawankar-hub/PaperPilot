FROM node:22-bookworm-slim

WORKDIR /app

# Install wget + ca-certs needed by Playwright's browser downloader
RUN apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

# Skip browser download during npm ci (we'll install below)
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

RUN npm ci

# Install Chromium + system deps — works because we ARE root inside Docker
RUN npx playwright install chromium --with-deps

COPY . .

ENV NODE_ENV=production
ENV PORT=10000
ENV PLAYWRIGHT_BROWSERS_PATH=0

EXPOSE 10000

CMD ["node", "index.js"]
