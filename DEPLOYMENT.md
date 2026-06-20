# Deployment Guide: Google Meet Clone

This application is built with a React/Vite frontend and a Node.js/Socket.io backend. Because Vercel only supports static hosting and serverless functions (which do not support persistent WebSockets/Socket.io), you cannot host the backend server on Vercel.

Here are the two best options to deploy your app live:

---

## Option 1: Combined Deployment on Render (Recommended & Easiest)
Since the Express server is already configured to serve the compiled client files (`client/dist`) on the same port, you can deploy the entire application (both frontend and backend) as a single service on **Render** (render.com). This is free and requires only one deployment!

### Steps:
1. **Push to GitHub**:
   - Create a new public or private repository on GitHub (e.g. `meet-app`).
   - Run these commands in your project terminal:
     ```bash
     git remote add origin https://github.com/Chetanmohane/<YOUR_REPO_NAME>.git
     git branch -M main
     git push -u origin main
     ```

2. **Deploy on Render**:
   - Go to [Render Dashboard](https://dashboard.render.com/) and sign in with GitHub.
   - Click **New** -> **Web Service**.
   - Connect your GitHub repository (`meet-app`).
   - Configure the Web Service settings:
     - **Name**: `meet-app`
     - **Region**: Choose closest to you
     - **Branch**: `main`
     - **Runtime**: `Node`
     - **Build Command**: `npm run install-all && npm run build --prefix client`
     - **Start Command**: `npm start --prefix server`
     - **Instance Type**: `Free`
   - Click **Deploy Web Service**.

Once deployed, Render will provide a single URL (e.g., `https://meet-app.onrender.com`) that runs both the frontend and the signaling server!

---

## Option 2: Split Deployment (Frontend on Vercel, Backend on Render)
If you specifically want the frontend to live on **Vercel** and are okay hosting the backend signaling server on **Render**, you can deploy them separately.

### Step 1: Deploy Backend to Render
1. Create a **Web Service** on Render from your GitHub repository.
2. Settings:
   - **Build Command**: `npm install --prefix server`
   - **Start Command**: `npm start --prefix server`
3. Get the backend URL (e.g., `https://meet-app-backend.onrender.com`).

### Step 2: Update Client WebSocket URL
In `client/src/hooks/useWebRTC.ts`, replace the local backend connection URL (around line 4) with your Render backend URL:
```typescript
// Replace this:
const SOCKET_SERVER_URL = window.location.hostname === 'localhost' ? 'http://localhost:5050' : window.location.origin;

// With your hosted Render backend URL:
const SOCKET_SERVER_URL = window.location.hostname === 'localhost' ? 'http://localhost:5050' : 'https://meet-app-backend.onrender.com';
```
*Commit and push this change to GitHub.*

### Step 3: Deploy Frontend to Vercel
1. Go to [Vercel Dashboard](https://vercel.com/) and log in.
2. Click **Add New** -> **Project**.
3. Import your GitHub repository (`meet-app`).
4. Configure the settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Click **Deploy**.

Vercel will build and host your frontend client, and it will connect to your backend signaling server hosted on Render!
