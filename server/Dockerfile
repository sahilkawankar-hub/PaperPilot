# Uses Microsoft's official Playwright image — Chromium + all system deps pre-installed
FROM mcr.microsoft.com/playwright/node:22-jammy

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy server source
COPY . .

ENV NODE_ENV=production
ENV PORT=10000
ENV PLAYWRIGHT_BROWSERS_PATH=0

EXPOSE 10000

CMD ["node", "index.js"]
