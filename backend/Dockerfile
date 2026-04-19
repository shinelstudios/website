# Node 20 slim + yt-dlp + ffmpeg. One image, one process (web / server.js).
# Mirror still runs on GitHub Actions cron — not in this image.
FROM node:20-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 ffmpeg ca-certificates curl \
 && rm -rf /var/lib/apt/lists/*

# Install yt-dlp as a standalone binary (avoids PEP 668 on Debian 12).
RUN curl -fsSL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
      -o /usr/local/bin/yt-dlp \
 && chmod +x /usr/local/bin/yt-dlp \
 && yt-dlp --version

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY . .

# Koyeb routes public traffic to $PORT (defaults to 8000 on Koyeb, but server.js
# reads PORT env var and falls back to 5000). Bind to 0.0.0.0 (already done in code).
ENV PORT=8000
EXPOSE 8000

CMD ["node", "server.js"]
