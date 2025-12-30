# Deployment Status & Configuration

## ✅ Code Changes Committed

### Backend (FastAPI)
- ✅ `main.py` - FastAPI backend with `/health` and `/run` endpoints
- ✅ `Procfile` - Railway start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- ✅ `requirements.txt` - Includes FastAPI, uvicorn, pydantic, python-multipart
- ✅ Error handling with structured responses: `{error, hint, detail}`
- ✅ CORS configured for `localhost:3000` and `*.vercel.app`
- ✅ Client folder mapping: melrose→Melrose, bestregard→Bestregard, fancy→Fancy
- ✅ Table row limits: 500 rows max with metadata

### Frontend (Next.js)
- ✅ `/web` directory with Next.js app
- ✅ `/login` page with client selection and access code
- ✅ `/dashboard` page with KPIs, chart, and table
- ✅ Auth middleware protecting `/dashboard`
- ✅ API routes: `/api/login`, `/api/session`, `/api/logout`

## ⚠️ Railway Configuration Required

**Current Status:** 502 error (service not responding)

**Root Cause:** Railway is likely still using old start command or missing environment variables.

### Required Actions in Railway Dashboard:

1. **Verify Start Command:**
   - Go to: Railway Dashboard → Project `keen-nurturing` → Service `htx_tap_dashboard` → Settings → Deploy
   - Start Command should be: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - OR Railway should auto-detect from `Procfile` (already committed)

2. **Set Environment Variables:**
   - `SUPABASE_URL` = [Your Supabase URL]
   - `SUPABASE_SERVICE_ROLE_KEY` = [Your service role key]
   - `SUPABASE_BUCKET` = `client-data`
   - `PORT` = [Auto-provided by Railway]

3. **Trigger Redeploy:**
   - Push to main branch (already done)
   - OR manually trigger redeploy in Railway Dashboard

4. **Verify Deployment:**
   ```bash
   curl https://htxtapdashboard-production.up.railway.app/health
   ```
   Expected: `{"ok": true, "timestamp": "..."}`

## 📋 Vercel Configuration

### Project Setup
1. Create project: `htx-tap-portal` in Vercel Dashboard
2. Connect repo: `Matty-1337/htx_tap_dashboard`
3. **Root Directory:** `web` (CRITICAL - must be set)
4. Framework: Next.js (auto-detected)

### Environment Variables (Set in Vercel Dashboard)
- `NEXT_PUBLIC_API_BASE_URL` = `https://htxtapdashboard-production.up.railway.app`
- `LOGIN_CODE_MELROSE` = `IfS9OobcCPl6k9uqS0L7eQ`
- `LOGIN_CODE_BESTREGARD` = `PugeCy9r2LYWRUqoC6Q4nQ`
- `LOGIN_CODE_FANCY` = `-d46XTdNSIodRSplhrxlLQ`
- `COOKIE_SECRET` = `oKjyk2zz2zv40NqzBHeA5Om8txmVVmtPCw65hy2dJ9E`

## 🧪 Smoke Test Checklist

### Backend (After Railway is configured)
- [ ] `GET https://htxtapdashboard-production.up.railway.app/health` → `{"ok": true}`
- [ ] `POST https://htxtapdashboard-production.up.railway.app/run` with `{"clientId":"melrose"}` → Returns JSON with `clientId`, `folder`, `kpis`, `charts`, `tables`

### Frontend (After Vercel is deployed)
- [ ] Visit `/login` page
- [ ] Select client (melrose/bestregard/fancy)
- [ ] Enter access code
- [ ] Redirects to `/dashboard`
- [ ] Dashboard shows KPIs, chart, and table

## 📝 Generated Access Codes

**Melrose:** `IfS9OobcCPl6k9uqS0L7eQ`
**Bestregard:** `PugeCy9r2LYWRUqoC6Q4nQ`
**Fancy:** `-d46XTdNSIodRSplhrxlLQ`
**Cookie Secret:** `oKjyk2zz2zv40NqzBHeA5Om8txmVVmtPCw65hy2dJ9E`

## 📧 Client Instructions Template

```
Subject: HTX TAP Analytics Portal Access

Your analytics dashboard is now available.

URL: [Vercel deployment URL - to be added after deployment]

To access:
1. Visit the URL above
2. Select your client name from the dropdown (Melrose / Bestregard / Fancy)
3. Enter your access code: [Use appropriate code from above]
4. Click "Login"

The dashboard includes:
- Key performance indicators (KPIs)
- Revenue charts and trends  
- Detailed analytics tables

To logout, click the "Logout" button in the top right.

For support, contact: [Your support email/phone]
```
