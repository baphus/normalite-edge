# Deployment Checklist - Normalite EDGE

Use this checklist to ensure all steps are completed before deploying to production.

---

## Pre-Deployment Preparation

### Code Quality
- [ ] Run tests locally: `npm test`
- [ ] Check for TypeScript errors: `npm run tsc:check`
- [ ] Run linter: `npm run lint`
- [ ] No console.logs or debug code in production files
- [ ] All dependencies are up to date: `npm outdated`

### Git & Version Control
- [ ] All changes are committed: `git status` shows clean
- [ ] Code is pushed to GitHub: `git push origin main`
- [ ] No uncommitted secrets or `.env` files
- [ ] Latest code is on `main` branch

### Documentation
- [ ] README.md is up to date
- [ ] API documentation covers all endpoints
- [ ] Database schema is documented
- [ ] Architecture decisions are recorded

---

## Step 1: Database Setup (Supabase)

- [ ] Go to [Supabase Console](https://supabase.com/dashboard)
- [ ] Create new project with strong password
- [ ] Wait for provisioning to complete (~2 min)
- [ ] Go to Settings → Database → Connection Pooling
- [ ] Copy connection string (Session mode pooler)
- [ ] Save securely (don't share or commit to git)
- [ ] Connection string format verified: `postgresql://postgres:[PASSWORD]@[PROJECT-REF].pooler.supabase.com:5432/postgres?sslmode=require&connection_limit=5&pool_timeout=20`
- [ ] Direct DB format verified: `postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require`

---

## Step 2: Generate JWT Secrets

- [ ] Open terminal in project root
- [ ] Run: `bash generate-secrets.sh` (macOS/Linux) or `generate-secrets.bat` (Windows)
- [ ] Copy the two generated secrets
- [ ] Keep them secure (don't share or commit)

**Or generate manually:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Step 3: Push to GitHub

```bash
git add .
git commit -m "Prepare for production deployment"
git push origin main
```

- [ ] Code is pushed
- [ ] No `.env` files in commit (verify with `git log -p`)

---

## Step 4: Backend Deployment (Render)

### Create Web Service

- [ ] Go to [Render Dashboard](https://dashboard.render.com)
- [ ] Click **New +** → **Web Service**
- [ ] Select your GitHub repository
- [ ] Configure:
  - [ ] **Name**: `normalite-edge-api`
  - [ ] **Environment**: `Node`
  - [ ] **Region**: Ohio (or closest region)
  - [ ] **Branch**: `main`
  - [ ] **Root Directory**: `server`
  - [ ] **Build Command**: `npm install && npm run build`
  - [ ] **Start Command**: `npm start`

### Add Environment Variables

Copy-paste this template and fill in YOUR values:

```
NODE_ENV=production
PORT=3000
DATABASE_URL=[PASTE_SUPABASE_CONNECTION_STRING]
DIRECT_URL=[PASTE_SUPABASE_DIRECT_CONNECTION_STRING]
JWT_ACCESS_SECRET=[PASTE_GENERATED_SECRET_1]
JWT_REFRESH_SECRET=[PASTE_GENERATED_SECRET_2]
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=[YOUR_GOOGLE_ID]
GOOGLE_CLIENT_SECRET=[YOUR_GOOGLE_SECRET]
CLIENT_URL=https://[YOUR_FRONTEND_DOMAIN].vercel.app
CLOUDINARY_CLOUD_NAME=[YOUR_CLOUDINARY_NAME]
CLOUDINARY_API_KEY=[YOUR_CLOUDINARY_API_KEY]
CLOUDINARY_API_SECRET=[YOUR_CLOUDINARY_API_SECRET]
```

- [ ] All environment variables entered
- [ ] DATABASE_URL is Supabase connection string
- [ ] DIRECT_URL is Supabase direct DB host
- [ ] JWT secrets are unique and strong
- [ ] CLIENT_URL will be your Vercel domain (update after frontend deploy)
- [ ] Optional vars (Google, Cloudinary) filled if applicable

### Deploy

- [ ] Click **Create Web Service**
- [ ] Wait for build to complete (~5-10 minutes)
- [ ] Check logs for errors
- [ ] Verify success: `curl https://normalite-edge-api.onrender.com/api/v1/health`
- [ ] Should return: `{"status":"ok","timestamp":"..."}`

**Note your Render URL**: `https://normalite-edge-api.onrender.com`

---

## Step 5: Frontend Deployment (Vercel)

### Create Vercel Project

- [ ] Go to [Vercel Dashboard](https://vercel.com/dashboard)
- [ ] Click **New Project** or **Add New**
- [ ] Select your GitHub repository
- [ ] Configure:
  - [ ] **Framework**: Vite
  - [ ] **Root Directory**: `client`
  - [ ] **Build Command**: `npm run build` (auto-detected)
  - [ ] **Output Directory**: `dist` (auto-detected)

### Add Environment Variables

- [ ] Click **Environment Variables**
- [ ] Add: `VITE_API_URL` = `https://normalite-edge-api.onrender.com/api/v1`
  - Replace with your actual Render URL from Step 4
  - DO NOT remove `VITE_` prefix

- [ ] Environment variable is set correctly
- [ ] Vercel will use this URL in production builds

### Deploy

- [ ] Click **Deploy**
- [ ] Wait for build to complete (~2-3 minutes)
- [ ] View deployment logs
- [ ] Verify success by visiting the deployment URL

**Note your Vercel URL**: `https://[project-name].vercel.app`

---

## Step 6: Update Backend with Frontend URL (Important!)

- [ ] Go to Render Dashboard → Your Service → **Environment**
- [ ] Find `CLIENT_URL` variable
- [ ] Update value to your Vercel URL from Step 5
- [ ] Example: `https://normalite-edge.vercel.app`
- [ ] Click **Save**
- [ ] **Redeploy**: Go to **Deploys** tab → click latest → **Redeploy**
- [ ] Wait for redeploy to complete
- [ ] Verify health check passes

---

## Step 7: Database Migrations

Run migrations on Supabase to create all tables:

```bash
# Get your Supabase connection string from Step 1
DATABASE_URL="postgresql://..." npx prisma migrate deploy

# Optional: Seed with initial data
DATABASE_URL="postgresql://..." npm run db:seed
```

- [ ] Migrations completed successfully
- [ ] Database tables created
- [ ] All data models are present

---

## Step 8: Production Testing

### Test Backend Connectivity

```bash
curl https://normalite-edge-api.onrender.com/api/v1/health
```

- [ ] Response is: `{"status":"ok","timestamp":"..."}`

### Test Frontend

- [ ] Open your Vercel URL in browser
- [ ] Page loads without errors
- [ ] Check browser console (F12) for any errors
- [ ] Check Network tab - no CORS errors

### Test Authentication Flow

- [ ] Try to login
- [ ] API call succeeds (check Network tab)
- [ ] User data displays correctly
- [ ] Token is stored in localStorage

### Test API Calls

- [ ] Make at least one API request from frontend
- [ ] Verify data is returned correctly
- [ ] Check response has correct HTTP status

---

## Step 9: Monitoring & Health Checks

### Log Monitoring

- [ ] Render Logs: Dashboard → Your Service → **Logs** (check for errors)
- [ ] Vercel Logs: Deployments → Click deployment → **Logs** (check for build issues)

### Configure Alerts (Optional)

- [ ] Render: Settings → **Alerts** → Add email alerts
- [ ] Vercel: Integrations → Monitoring tools

---

## Step 10: Security Verification

- [ ] No `.env` files visible in GitHub
- [ ] SECRET KEYS never logged or exposed in console
- [ ] HTTPS is enabled (automatic with Render + Vercel)
- [ ] CORS is configured correctly (no `*` in production)
- [ ] Database connection uses SSL: `?sslmode=require`
- [ ] JWT tokens have appropriate expiration times

---

## Step 11: Custom Domain (Optional)

### Vercel Custom Domain

- [ ] Go to Vercel → Settings → **Domains**
- [ ] Add your domain (e.g., `app.normalite.com`)
- [ ] Follow DNS configuration instructions
- [ ] Wait for SSL certificate (~5 minutes)

### Render Custom Domain

- [ ] Go to Render → Settings → **Custom Domain**
- [ ] Add your domain (e.g., `api.normalite.com`)
- [ ] Update DNS CNAME record
- [ ] Verify DNS resolves correctly

---

## Post-Deployment

### Documentation

- [ ] Update team wiki/docs with production URLs
- [ ] Document any deployment special cases
- [ ] Record deployment date and version
- [ ] Share access credentials securely with team

### Monitoring Setup

- [ ] Set up error tracking (Sentry, LogRocket, etc.)
- [ ] Enable analytics (Vercel Analytics)
- [ ] Monitor database performance (Supabase dashboard)
- [ ] Set up uptime monitoring (Uptimerobot)

### Team Notification

- [ ] Notify team of deployment
- [ ] Share production URLs
- [ ] Share any access information needed
- [ ] Document rollback procedure

---

## Troubleshooting During Deployment

### Backend fails to build
1. Check `npm run build` works locally: `cd server && npm run build`
2. Verify TypeScript: `npx tsc`
3. Check Render logs for specific error
4. Fix issue locally, push to GitHub, redeploy

### Frontend can't connect to backend
1. Verify `VITE_API_URL` in Vercel matches Render URL exactly
2. Check Render backend is running: `curl https://...onrender.com/api/v1/health`
3. Check browser Network tab for CORS errors
4. Verify `CLIENT_URL` in Render matches Vercel domain exactly
5. Redeploy both if you made changes

### CORS errors in browser
1. Go to Render → Environment → check `CLIENT_URL`
2. Must be exact: `https://yourdomain.vercel.app` (with protocol, no trailing slash)
3. Redeploy Render after updating
4. Clear browser cache (Ctrl+Shift+Delete)

### Database connection fails
1. Verify `DATABASE_URL` is correct in Render env
2. Test connection: `DATABASE_URL="..." npx prisma studio`
3. Check Supabase project is active
4. Verify no special characters in password (URL encode if needed)

---

## Success Criteria

✓ You can sign up / login on production
✓ Frontend loads without console errors
✓ API calls work from frontend
✓ Database stores user data correctly
✓ All pages load without 404 errors
✓ No sensitive data is exposed in logs
✓ Team can access and use the application

---

## Next Steps

1. **Monitor closely** for 24 hours after deployment
2. **Gather feedback** from early users
3. **Fix any bugs** that arise
4. **Plan next release** based on learnings

---

For detailed guides, see:
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Detailed deployment steps
- [LOCAL_SETUP.md](./LOCAL_SETUP.md) - Local development setup

