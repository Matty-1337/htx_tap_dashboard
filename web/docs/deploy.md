# Deployment Guide

## Overview

This application consists of:
- **Backend**: FastAPI deployed on Railway at `https://htxtapdashboard-production.up.railway.app`
- **Frontend**: Next.js deployed on Vercel with custom domains (e.g., `fancy.htxtap.com`)

## Required Environment Variables

### Vercel (Frontend)

The frontend **requires** the following environment variable to be set in production:

#### `NEXT_PUBLIC_API_BASE_URL`

- **Value**: `https://htxtapdashboard-production.up.railway.app`
- **Purpose**: Points the frontend API calls to the Railway backend
- **Required**: Yes (production)
- **Target**: Production and Preview environments

### Setting Environment Variables in Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: **htx-tap-portal**
3. Navigate to: **Settings** → **Environment Variables**
4. Click **Add New**
5. Enter:
   - **Key**: `NEXT_PUBLIC_API_BASE_URL`
   - **Value**: `https://htxtapdashboard-production.up.railway.app`
   - **Environment**: Select **Production** and **Preview** (optionally **Development** for local testing)
6. Click **Save**
7. **Redeploy** the application for changes to take effect

### Railway (Backend)

The backend environment variables are already configured:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_BUCKET=client-data`

These are managed in the Railway dashboard and do not need to be changed.

## Verification Steps

After deployment, verify the following:

### 1. Backend Health Check

```bash
curl https://htxtapdashboard-production.up.railway.app/health
```

Expected response:
```json
{
  "ok": true,
  "env": {
    "SUPABASE_URL": true,
    "SUPABASE_SERVICE_ROLE_KEY": true,
    "SUPABASE_BUCKET": true
  }
}
```

### 2. Frontend API Configuration

1. Visit your frontend URL (e.g., `https://fancy.htxtap.com`)
2. Open browser DevTools → Console
3. Look for log message: `[ApiConfigGuard] API Base URL: https://htxtapdashboard-production.up.railway.app`
4. If you see an error banner instead, the environment variable is not set correctly

### 3. Test API Calls

1. Open browser DevTools → Network tab
2. Click "Run Analysis" on the dashboard
3. Verify:
   - Request goes to `/api/run` (Next.js API route)
   - Next.js API route proxies to `https://htxtapdashboard-production.up.railway.app/run`
   - Response includes `dataCoverage` and `charts` with real data (not zeros)

### 4. Test Navigation

1. Click sidebar links: **Team**, **Menu**, **Waste**, **Time**, **Actions**
2. Verify:
   - No 404 errors
   - Pages load correctly
   - Data displays (if applicable)

## Troubleshooting

### Issue: "API Configuration Missing" error banner

**Cause**: `NEXT_PUBLIC_API_BASE_URL` is not set in Vercel.

**Solution**:
1. Follow the steps above to set the environment variable
2. Redeploy the application
3. Clear browser cache and reload

### Issue: API calls return 500 "Backend configuration missing"

**Cause**: Same as above - environment variable not set.

**Solution**: Set `NEXT_PUBLIC_API_BASE_URL` in Vercel and redeploy.

### Issue: Sidebar links return 404

**Cause**: Middleware is incorrectly rewriting routes.

**Solution**: Ensure `/team`, `/menu`, `/waste`, `/time`, `/actions` are in the `BYPASS_PREFIXES` array in `middleware.ts`.

### Issue: API calls work but return empty data

**Cause**: Backend may be having issues or client data is missing.

**Solution**:
1. Check Railway logs: `railway logs`
2. Verify Supabase bucket contains client data files
3. Test backend directly: `curl -X POST https://htxtapdashboard-production.up.railway.app/run -H "Content-Type: application/json" -d '{"clientId":"melrose","params":{"dateRange":{"preset":"30d"}}}'`

## Local Development

For local development, you can either:

### Option 1: Use Local Backend (Default)

1. Start the Railway backend locally or use the production URL
2. Create `.env.local`:
   ```
   NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
   ```
3. Run `npm run dev`

### Option 2: Use Production Backend

1. Create `.env.local`:
   ```
   NEXT_PUBLIC_API_BASE_URL=https://htxtapdashboard-production.up.railway.app
   ```
2. Run `npm run dev`

**Note**: The frontend will fall back to `http://127.0.0.1:8000` in development if the env var is not set, but this will show a console warning.

## Deployment Checklist

Before deploying to production:

- [ ] `NEXT_PUBLIC_API_BASE_URL` is set in Vercel for Production and Preview
- [ ] Backend is deployed and healthy on Railway
- [ ] Frontend builds successfully (`npm run build`)
- [ ] All sidebar routes work (no 404s)
- [ ] API calls return real data (not zeros)
- [ ] Date presets (30d, 90d) work correctly
