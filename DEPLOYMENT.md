# Deployment Guide - Normalite EDGE

This guide walks you through deploying Normalite EDGE to production using:
- **Frontend**: Vercel
- **Backend**: Render  
- **Database**: Supabase

## Quick Start Checklist

- [ ] Create Supabase project and get connection string
- [ ] Push code to GitHub
- [ ] Deploy backend to Render
- [ ] Deploy frontend to Vercel
- [ ] Run database migrations
- [ ] Test production environment

---

## Part 1: Database Setup (Supabase)

### 1.1 Create Supabase Project

1. Go to [Supabase Console](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Configure:
   - **Name**: `normalite-edge`
   - **Database Password**: Use a strong password (save securely)
   - **Region**: Choose closest to your users
4. Wait for provisioning (~2 minutes)

### 1.2 Get Connection String

1. Go to **Project Settings** → **Database** → **Connection Pooling**
2. Copy the connection string for **Session mode** pooler
3. Replace `[YOUR-PASSWORD]` with your actual database password
4. Format:
   ```
   postgresql://postgres:[PASSWORD]@[PROJECT-REF].pooler.supabase.com:5432/postgres?sslmode=require
   ```

Also copy your direct database connection string (for Prisma direct operations):

```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require
```

### 1.3 Test Connection Locally (Optional)

```bash
# Replace with your Supabase connection string
DATABASE_URL="postgresql://postgres:password@host:5432/postgres?sslmode=require" npx prisma db push
```

---

## Part 2: Backend Deployment (Render)

### 2.1 Push to GitHub

Ensure your code is on GitHub:
```bash
git add .
git commit -m "Prepare for production deployment"
git push origin main
```

### 2.2 Create Render Web Service

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Select your GitHub repository
4. Configure settings:
   - **Name**: `normalite-edge-api`
   - **Environment**: `Node`
   - **Region**: Ohio (or closest to you)
   - **Branch**: `main`
   - **Root Directory**: `server`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

### 2.3 Add Environment Variables

In Render → Your Service → **Environment** tab, add:

```
NODE_ENV=production
PORT=3000
DATABASE_URL=[YOUR_SUPABASE_CONNECTION_STRING]
DIRECT_URL=[YOUR_SUPABASE_DIRECT_CONNECTION_STRING]
PRISMA_CONNECTION_LIMIT=1
PRISMA_POOL_TIMEOUT=30
JWT_ACCESS_SECRET=[GENERATE_WITH: openssl rand -hex 32]
JWT_REFRESH_SECRET=[GENERATE_WITH: openssl rand -hex 32]
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=[YOUR_GOOGLE_CLIENT_ID]
GOOGLE_CLIENT_SECRET=[YOUR_GOOGLE_CLIENT_SECRET]
CLIENT_URL=https://[YOUR-VERCEL-DOMAIN].vercel.app
CLOUDINARY_CLOUD_NAME=[YOUR_CLOUDINARY_NAME]
CLOUDINARY_API_KEY=[YOUR_CLOUDINARY_API_KEY]
CLOUDINARY_API_SECRET=[YOUR_CLOUDINARY_API_SECRET]
```

**Generate JWT Secrets** (Linux/macOS/Windows Git Bash):
```bash
# Access token secret
openssl rand -hex 32

# Refresh token secret  
openssl rand -hex 32
```

Or use Node.js:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2.4 Deploy

Click **"Create Web Service"** and wait for deployment (~5-10 minutes).

**Your backend URL will be**: `https://normalite-edge-api.onrender.com`

### 2.5 Test Backend

```bash
curl https://normalite-edge-api.onrender.com/api/v1/health
```

---

## Part 3: Frontend Deployment (Vercel)

### 3.1 Create Vercel Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"New Project"** or **"Add New..."**
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `client`
   - **Build Command**: `npm run build` (should auto-detect)
   - **Install Command**: `npm install` (should auto-detect)
   - **Output Directory**: `dist` (should auto-detect)

### 3.2 Add Environment Variables

In Vercel → Project Settings → **Environment Variables**, add:

```
VITE_API_URL=https://normalite-edge-api.onrender.com/api/v1
```

**Important**: 
- Use `VITE_` prefix for frontend variables (Vite requirement)
- Vercel needs to know the Render backend URL **before** deploying frontend

### 3.3 Deploy

Click **"Deploy"** and wait (~2-3 minutes).

**Your frontend URL will be**: `https://[project-name].vercel.app`

### 3.4 Verify Frontend

1. Visit your Vercel URL
2. Check browser console (F12) for errors
3. Test login functionality
4. Verify API calls work

---

## Part 4: Post-Deployment Setup

### 4.1 Update Backend CORS

Your `server/src/config/cors.ts` already includes `CLIENT_URL` from environment variables. Verify it contains:

```typescript
const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    env.CLIENT_URL  // ← This auto-includes your Vercel domain
];
```

### 4.2 Run Database Migrations

After backend deployment, run migrations on Supabase:

```bash
# Get your Supabase connection string and run:
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres?sslmode=require" npx prisma migrate deploy

# Optional: Seed with initial data
DATABASE_URL="..." npm run db:seed
```

### 4.3 Update Vercel With Your Backend URL

After Render deployment completes:

1. Go to Vercel Project Settings → **Environment Variables**
2. Update `VITE_API_URL` with your actual Render URL
3. Click **"Save"**
4. Redeploy: Go to Deployments → **Redeploy**

---

## Troubleshooting

### Frontend can't connect to backend
**Symptoms**: API calls fail with 404, CORS errors, or timeouts

**Solutions**:
- Verify `VITE_API_URL` in Vercel environment variables
- Confirm Render backend is running: `curl https://normalite-edge-api.onrender.com/api/v1/health`
- Check browser Network tab for actual requests
- Restart Vercel deployment after updating env vars

### CORS errors
**Symptoms**: Browser shows "Access to XMLHttpRequest blocked by CORS"

**Solutions**:
- Verify `CLIENT_URL` in Render matches your Vercel domain exactly
- Include protocol: `https://yourapp.vercel.app` (not just `yourapp.vercel.app`)
- Redeploy backend after updating `CLIENT_URL`

### Database connection fails
**Symptoms**: "ECONNREFUSED" or timeout errors in Render logs

**Solutions**:
- Verify Supabase DATABASE_URL is set in Render env vars
- Check connection string format: `postgresql://user:password@host:port/db?sslmode=require`
- Ensure Supabase project is active (check Supabase dashboard)
- Test locally first: `DATABASE_URL="..." npx prisma studio`

### Build fails on Render
**Symptoms**: Deploy shows red X, check logs in Render dashboard

**Solutions**:
- Verify `npm run build` works locally: `cd server && npm run build`
- Check TypeScript errors: `cd server && npx tsc`
- Ensure `package.json` has all dependencies
- Check Node.js version (Render auto-detects from `.nvmrc` or `package.json`)

### 401 Unauthorized errors
**Symptoms**: Login fails with 401, API calls return 401

**Solutions**:
- Verify JWT secrets are set identically in Render env vars
- Check access token is in localStorage (check browser DevTools)
- Verify Authorization header is being sent: check Network tab in DevTools
- Ensure refresh token cookie is being set (withCredentials=true in axios)

---

## Environment Variables Reference

### Backend (Render)

| Variable | Example | Required | Notes |
|----------|---------|----------|-------|
| `NODE_ENV` | `production` | Yes | Must be `production` in Render |
| `DATABASE_URL` | `postgresql://...` | Yes | From Supabase |
| `DIRECT_URL` | `postgresql://...` | Yes | Direct DB host (not pooler) |
| `JWT_ACCESS_SECRET` | 64-char hex | Yes | Generate with openssl rand -hex 32 |
| `JWT_REFRESH_SECRET` | 64-char hex | Yes | Generate with openssl rand -hex 32 |
| `CLIENT_URL` | `https://app.vercel.app` | Yes | Your Vercel domain |
| `GOOGLE_CLIENT_ID` | OAuth ID | No | For Google login |
| `GOOGLE_CLIENT_SECRET` | OAuth secret | No | For Google login |
| `CLOUDINARY_*` | Cloud config | No | For image uploads |

### Frontend (Vercel)

| Variable | Example | Required |
|----------|---------|----------|
| `VITE_API_URL` | `https://...onrender.com/api/v1` | Yes |

---

## Custom Domains (Optional)

### Add Custom Domain to Vercel
1. Go to Project Settings → **Domains**
2. Enter your custom domain
3. Follow DNS instructions
4. Wait for SSL certificate (~5 minutes)

### Add Custom Domain to Render
1. Go to Web Service Settings → **Custom Domain**
2. Add your domain
3. Update DNS CNAME record to point to Render

---

## Monitoring & Logs

### View Backend Logs (Render)
- Dashboard → Your Service → **Logs** tab
- Shows real-time backend activity

### View Frontend Logs (Vercel)
- Dashboard → Deployments → Click deployment → **Logs**
- Shows build and runtime logs

### Monitor Performance
- Render: Settings → **Alerts** (set up notifications)
- Vercel: Integrations → Monitoring tools

---

## Rollback Strategy

### Vercel Rollback
1. Go to Deployments
2. Click the deployment before the broken one
3. Click "Redeploy"

### Render Rollback
1. Go to Deploys tab
2. Click deploy before the broken one
3. Click "Deploy"

---

## Continuous Deployment

Both Vercel and Render watch your GitHub repository:
- Push to `main` → automatic production deployment
- Create pull request → Vercel preview deployment

No additional CI/CD configuration needed!

---

## Security Checklist

- [ ] JWT secrets are strong (32+ characters)
- [ ] DATABASE_URL is only in Render (never in git)
- [ ] CLIENT_URL matches your Vercel domain exactly
- [ ] Credentials removed from `.env.example` (use placeholders only)
- [ ] `.env` files added to `.gitignore` (already done)
- [ ] Google OAuth secrets are secure

---

## Next Steps After Deployment

1. **Test thoroughly** in production
2. **Set up monitoring** (Render alerts, error tracking)
3. **Configure custom domain** (if you have one)
4. **Enable SSL** (automatic with Render + Vercel)
5. **Set up analytics** (optional: Vercel Analytics)

