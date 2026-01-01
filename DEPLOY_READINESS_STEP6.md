# Step 6: Deploy Readiness Requirements

## 6A) Vercel (Frontend)

### Project Configuration
- **Project Name**: `htx-tap-dashboard` (or whatever is connected in Vercel)
- **Root Directory**: `/frontend/web` (or `/web` if root is at repo root level)

### Environment Variables

In Vercel → Project Settings → Environment Variables, set for **Production + Preview**:

| Variable | Value | Notes |
|----------|-------|-------|
| `NEXT_PUBLIC_API_BASE_URL` | `https://<YOUR-RAILWAY-BACKEND-DOMAIN>` | **No trailing slash**. Example: `https://htx-tap-backend.up.railway.app` |
| `LOGIN_CODE_MELROSE` | `<your-melrose-code>` | Access code for Melrose client |
| `LOGIN_CODE_BESTREGARD` | `<your-bestregard-code>` | Access code for Bestregard client |
| `LOGIN_CODE_FANCY` | `<your-fancy-code>` | Access code for Fancy client |
| `COOKIE_SECRET` | `<your-secret-key>` | Secret for signing JWT cookies |

### Important: NEXT_PUBLIC_API_BASE_URL Rules
- ✅ **NO trailing slash**: `https://htx-tap-backend.up.railway.app` (correct)
- ❌ **WITH trailing slash**: `https://htx-tap-backend.up.railway.app/` (incorrect)

### Frontend API Endpoint Usage
The frontend uses `NEXT_PUBLIC_API_BASE_URL` to construct API calls to the `/run` endpoint:
- Full URL: `${NEXT_PUBLIC_API_BASE_URL}/run`
- Method: `POST`
- Example: `https://htx-tap-backend.up.railway.app/run`

---

## 6B) Railway (Backend)

### Start Command

**Option 1: Railway "Start Command" Field (Recommended)**
```
uvicorn main:app --host 0.0.0.0 --port $PORT
```

**Option 2: Procfile** (already exists at `frontend/Procfile`)
```
web: uvicorn main:app --host 0.0.0.0 --port $PORT
```

**Option 3: railway.json** (if used)
```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "uvicorn main:app --host 0.0.0.0 --port $PORT"
  }
}
```

### Required Environment Variables

Set in Railway → Service → Variables:

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `SUPABASE_URL` | Supabase project URL (e.g., `https://xxxxx.supabase.co`) | ✅ Yes | - |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (starts with `eyJ...`) | ✅ Yes | - |
| `SUPABASE_BUCKET` | Storage bucket name | ⚠️ Recommended | `client-data` |
| `PORT` | Server port | ❌ No | Auto-provided by Railway |

### Health Check (After Deploy)

**GET Health Endpoint:**
```bash
GET https://<railway-domain>/health
```

**Expected Response:**
```json
{
  "ok": true,
  "timestamp": "2025-01-01T12:00:00",
  "cwd": "/app",
  "env_file": {
    "path": "/app/.env",
    "exists": false
  },
  "env": {
    "SUPABASE_URL": true,
    "SUPABASE_SERVICE_ROLE_KEY": true,
    "SUPABASE_BUCKET": true
  }
}
```

**POST /run Endpoint Test:**
```bash
POST https://<railway-domain>/run
Content-Type: application/json

{
  "clientId": "fancy",
  "params": {
    "dateRange": {
      "preset": "30d"
    }
  }
}
```

**Expected Response Structure:**
```json
{
  "charts": {
    "hour_of_day": [
      { "Hour": 0, "Net Price": 1234.56, "Order Id": 98 },
      { "Hour": 1, "Net Price": 0, "Order Id": 0 },
      ...
      { "Hour": 23, "Net Price": 0, "Order Id": 0 }
    ],
    "day_of_week": [
      { "Day": "Monday", "Net Price": 1234.56, "Order Id": 98 },
      ...
      { "Day": "Sunday", "Net Price": 0, "Order Id": 0 }
    ],
    "hourly_revenue": [...]  // Legacy compatibility
  },
  ...
}
```

**Validation Checklist:**
- ✅ `charts.hour_of_day` exists with 24 rows (Hour 0-23)
- ✅ `charts.day_of_week` exists with 7 rows (Monday-Sunday)
- ✅ All hours 0-23 present (missing filled with 0)
- ✅ All days Monday-Sunday present (missing filled with 0)
- ✅ Keys: `Hour`/`Day`, `Net Price`, `Order Id`

---

## Deployment Verification Checklist

### Railway Backend
- [ ] Start command set: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- [ ] Environment variables set: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_BUCKET`
- [ ] Health check passes: `GET https://<railway-domain>/health` returns `{"ok": true}`
- [ ] `/run` endpoint works: `POST https://<railway-domain>/run` returns Step 5 charts
- [ ] `charts.hour_of_day` has 24 rows
- [ ] `charts.day_of_week` has 7 rows

### Vercel Frontend
- [ ] Root directory set: `/frontend/web` (or `/web`)
- [ ] Environment variables set for Production + Preview:
  - [ ] `NEXT_PUBLIC_API_BASE_URL` = `https://<railway-domain>` (no trailing slash)
  - [ ] `LOGIN_CODE_MELROSE`
  - [ ] `LOGIN_CODE_BESTREGARD`
  - [ ] `LOGIN_CODE_FANCY`
  - [ ] `COOKIE_SECRET`
- [ ] Frontend builds successfully
- [ ] Frontend can reach Railway backend at `/run` endpoint

---

## Quick Test Commands

### Test Railway Backend (PowerShell)
```powershell
# Health check
Invoke-RestMethod -Uri "https://<railway-domain>/health" -Method GET

# Test /run endpoint
$body = @{
    clientId = "fancy"
    params = @{
        dateRange = @{
            preset = "30d"
        }
    }
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "https://<railway-domain>/run" -Method POST -ContentType "application/json" -Body $body
```

### Test Railway Backend (curl)
```bash
# Health check
curl https://<railway-domain>/health

# Test /run endpoint
curl -X POST https://<railway-domain>/run \
  -H "Content-Type: application/json" \
  -d '{"clientId":"fancy","params":{"dateRange":{"preset":"30d"}}}'
```

---

## Notes

- **Railway Port**: The `$PORT` variable is automatically provided by Railway - do not set it manually
- **Vercel Root Directory**: Make sure Vercel is building from the `/frontend/web` directory (contains `package.json`, `next.config.ts`)
- **API Base URL**: Must NOT have trailing slash - frontend code constructs full paths like `${API_BASE_URL}/run`
- **Step 5 Charts**: Backend must return `charts.hour_of_day` (24 rows) and `charts.day_of_week` (7 rows) for Step 5 compliance
