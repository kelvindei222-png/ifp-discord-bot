# Use Node.js 22 LTS version (required for Discord.js voice)
FROM node:22-alpine

# Install system dependencies first
RUN apk add --no-cache \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    ffmpeg \
    python3 \
    py3-pip \
    make \
    g++

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Set environment variable to skip Python check for youtube-dl
ENV YOUTUBE_DL_SKIP_PYTHON_CHECK=1

# Install Node.js dependencies
RUN npm install --only=production

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Remove development dependencies and source code
RUN rm -rf src/ && \
    rm -rf node_modules && \
    npm install --only=production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S ifpbot -u 1001 && \
    chown -R ifpbot:nodejs /app

# Switch to non-root user
USER ifpbot

# Expose port (if needed for health checks)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "console.log('Bot is healthy')" || exit 1

# Start the bot
CMD ["node", "dist/index.js"]