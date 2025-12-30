# Railway Configuration Instructions

## Critical: Change Start Command

Railway is currently trying to run Streamlit (`app.py`), which causes 502 errors because:
1. Streamlit requires `.streamlit/secrets.toml` which doesn't exist on Railway
2. We need FastAPI (`main.py`) instead

## Steps to Fix:

### 1. Set Start Command in Railway Dashboard
1. Go to Railway Dashboard → Project `keen-nurturing` → Service `htx_tap_dashboard`
2. Go to **Settings** → **Deploy**
3. Set **Start Command** to:
   ```
   uvicorn main:app --host 0.0.0.0 --port $PORT
   ```
4. Or Railway will auto-detect from `Procfile` (already committed)

### 2. Verify Environment Variables
In Railway Dashboard → Service → Variables, ensure these exist:
- `SUPABASE_URL` (your Supabase project URL)
- `SUPABASE_SERVICE_ROLE_KEY` (your service role key)
- `SUPABASE_BUCKET` = `client-data`
- `PORT` (auto-provided by Railway)

### 3. Trigger Redeploy
- Option A: Push to main (already done - should auto-deploy)
- Option B: Manual redeploy in Railway Dashboard

### 4. Verify Deployment
After redeploy, test:
```bash
curl https://htxtapdashboard-production.up.railway.app/health
```

Should return: `{"ok": true, "timestamp": "..."}`

## Alternative: Use Railway CLI

If you have Railway CLI linked:
```bash
railway service
# Select: htx_tap_dashboard

railway variables set START_COMMAND="uvicorn main:app --host 0.0.0.0 --port $PORT"
railway up
```
