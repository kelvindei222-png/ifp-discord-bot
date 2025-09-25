# Discord Bot 24/7 Deployment Guide

Your Discord bot is now ready for cloud deployment! Here are the best options:

## 🚄 **Option 1: Railway (RECOMMENDED)**
**Cost:** $5/month (includes 500 hours/month + $0.01 per additional hour)
**Pros:** Easy setup, great for Discord bots, automatic deployments

### Steps:
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "Deploy from GitHub repo"
4. Connect your GitHub account and select your bot repository
5. Railway will automatically detect the Dockerfile and deploy

### Environment Variables (add these in Railway dashboard):
```
DISCORD_BOT_TOKEN=your_bot_token_here
NODE_ENV=production
SPOTIFY_CLIENT_ID=your_spotify_id (optional)
SPOTIFY_CLIENT_SECRET=your_spotify_secret (optional)
SOUNDCLOUD_CLIENT_ID=your_soundcloud_id (optional)
```

---

## 🎨 **Option 2: Render.com**
**Cost:** Free tier available, $7/month for always-on
**Pros:** Free tier, easy GitHub integration

### Steps:
1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Click "New" → "Web Service"
4. Connect your repository
5. Use these settings:
   - **Build Command:** `npm run build`
   - **Start Command:** `npm start`
   - **Environment:** Docker

---

## ☁️ **Option 3: Google Cloud Run**
**Cost:** Pay per use (very cheap for Discord bots)
**Pros:** Only pay when running, scales to zero

### Steps:
1. Install Google Cloud CLI
2. Run: `gcloud builds submit --tag gcr.io/YOUR_PROJECT/discord-bot`
3. Deploy: `gcloud run deploy --image gcr.io/YOUR_PROJECT/discord-bot --platform managed`

---

## 🐳 **Option 4: Self-hosted with Docker**
**Cost:** Your own server costs
**Pros:** Full control, can use any VPS

### Commands:
```bash
# Build the image
docker build -t discord-bot .

# Run with environment variables
docker run -d --name discord-bot \
  -e DISCORD_BOT_TOKEN=your_token \
  -e NODE_ENV=production \
  --restart unless-stopped \
  discord-bot
```

---

## 📋 **Pre-Deployment Checklist**

✅ **Your bot is prepared with:**
- ✅ Production-ready Dockerfile with FFmpeg
- ✅ Optimized package.json
- ✅ Docker ignore file
- ✅ Railway and Render configs

✅ **You'll need:**
- ✅ Your Discord bot token (from Discord Developer Portal)
- ✅ GitHub repository (create one if you don't have it)
- ✅ Optional: Spotify API credentials for enhanced music features

---

## 🚀 **Recommended Next Steps:**

1. **Push to GitHub** (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial Discord bot deployment"
   git branch -M main
   git remote add origin https://github.com/yourusername/your-repo.git
   git push -u origin main
   ```

2. **Deploy on Railway** (easiest option):
   - Sign up at railway.app
   - Connect GitHub repo
   - Set environment variables
   - Deploy automatically

3. **Monitor your bot** - Check logs in the Railway/Render dashboard

---

## 🔧 **Environment Variables Needed:**

| Variable | Required | Description |
|----------|----------|-------------|
| `DISCORD_BOT_TOKEN` | ✅ | Your Discord bot token |
| `NODE_ENV` | ✅ | Set to "production" |
| `SPOTIFY_CLIENT_ID` | ❌ | For Spotify music features |
| `SPOTIFY_CLIENT_SECRET` | ❌ | For Spotify music features |
| `SOUNDCLOUD_CLIENT_ID` | ❌ | For SoundCloud features |

---

## 🎵 **Audio Features Working:**
- ✅ FFmpeg included in Docker image
- ✅ Radio streams (SomaFM)
- ✅ Smart music matching
- ✅ Volume control
- ✅ Queue management

Your bot will be online 24/7 once deployed! 🎉