# Node 20 slim + yt-dlp + ffmpeg (ffmpeg is needed by yt-dlp for bestvideo+bestaudio muxing).
# One image, two processes (web + mirror) — selected by fly.toml [processes].
FROM node:20-slim

# Install Python (yt-dlp runtime), pip, ffmpeg, ca-certs.
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 python3-pip ffmpeg ca-certificates curl \
 && rm -rf /var/lib/apt/lists/*

# Install yt-dlp as a standalone binary (avoids PEP 668 pip restrictions on Debian 12+).
RUN curl -fsSL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
      -o /usr/local/bin/yt-dlp \
 && chmod +x /usr/local/bin/yt-dlp \
 && yt-dlp --version

WORKDIR /app

# Install Node deps first for caching.
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy source.
COPY . .

# server.js listens on PORT (default 5000). Fly terminates TLS and proxies to :5000.
ENV PORT=5000
EXPOSE 5000

# Default CMD is overridden per-process by fly.toml [processes]. Left as `node server.js`
# for local `docker run` / fallbacks.
CMD ["node", "server.js"]
