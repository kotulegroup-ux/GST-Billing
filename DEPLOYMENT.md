# Free Hosting Guide for FinTrack GST Accounting

This application is a full-stack Node.js + Express backend with an embedded SQLite database (`better-sqlite3`) and a modern React Vite frontend. Because it uses persistent backend database storage and Google Drive integration, the best free hosting services are platforms that run a persistent Node.js service or Docker container.

---

## Recommended Free Hosting Platforms

### 1. Render.com (Recommended - Easiest & 100% Free)
Render offers a free tier for Web Services with automatic Git deployments and free SSL certificates.

#### Steps:
1. Push this project to your **GitHub** account.
2. Sign up / Log in to [Render.com](https://render.com).
3. Click **New +** -> **Web Service**.
4. Connect your GitHub repository.
5. Configure the settings:
   - **Name**: `fintrack-gst-accounting`
   - **Language**: `Node`
   - **Branch**: `main`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
6. Under **Environment Variables**, add:
   - `NODE_ENV`: `production`
   - `SESSION_SECRET`: Any random secure key (e.g., `gst_secure_key_2026_xyz`)
   - `APP_URL`: Your Render service URL (e.g., `https://fintrack-gst-accounting.onrender.com`)
   - `GOOGLE_CLIENT_ID`: (Your Google Cloud OAuth Client ID)
   - `GOOGLE_CLIENT_SECRET`: (Your Google Cloud OAuth Client Secret)
7. Click **Create Web Service**. Render will install dependencies, build the frontend (`dist/`), and start the app with full HTTPS!

*(Note: If you use the provided `render.yaml` file, Render can configure these settings automatically).*

---

### 2. Koyeb (High Performance Free Tier)
Koyeb provides a free "Eco" web service tier with near-instant deployments:
1. Sign up at [Koyeb.com](https://www.koyeb.com).
2. Choose **GitHub** as the deployment method.
3. Select this repository.
4. Set:
   - **Build Command**: `npm install && npm run build`
   - **Run Command**: `npm start`
   - **Port**: `3000` (or leave default, Koyeb detects it automatically)
5. Add your environment variables (`NODE_ENV=production`, `SESSION_SECRET`, `APP_URL`).
6. Deploy.

---

### 3. Railway.app
1. Go to [Railway.app](https://railway.app).
2. Click **New Project** -> **Deploy from GitHub repo**.
3. Select this repository.
4. Railway will automatically detect Node.js, run `npm install && npm run build`, and execute `npm start`.
5. Under **Settings** -> **Networking**, click **Generate Domain** to get your public URL.

---

### 4. Fly.io (Best for Persistent Local Disks)
Fly.io provides free tier allowances and supports mounting persistent volumes for SQLite:
1. Install Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. Run in the project folder:
   ```bash
   fly launch
   ```
3. When prompted, select Node.js or Dockerfile.
4. Fly will build the Docker container and deploy your app.

---

## Environment Variables Reference

| Variable | Description | Example |
| :--- | :--- | :--- |
| `PORT` | Dynamic port provided automatically by host | `3000` (auto-set by hosting provider) |
| `NODE_ENV` | Run in production mode | `production` |
| `SESSION_SECRET` | Secret key for encrypting user login cookies | `your_long_random_secret_string` |
| `APP_URL` | Public URL of your deployed application | `https://your-app.onrender.com` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID for Admin Drive Sync | `xxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET`| Google OAuth Client Secret | `GOCSPX-xxx` |

---

## Google Drive OAuth Redirect URI Setup
Once your free app is deployed and you have your live domain (e.g. `https://your-app.onrender.com`):
1. Go to [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials).
2. Open your OAuth 2.0 Client ID.
3. Under **Authorized redirect URIs**, add:
   ```
   https://your-app.onrender.com/api/auth/google/callback
   ```
4. Save changes. Admin Google Drive Cloud sync and backup will now work seamlessly on your live hosted app!
