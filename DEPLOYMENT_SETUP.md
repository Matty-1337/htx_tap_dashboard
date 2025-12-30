# Deployment Setup Summary

## Generated Access Codes

**Melrose:** `IfS9OobcCPl6k9uqS0L7eQ`
**Bestregard:** `PugeCy9r2LYWRUqoC6Q4nQ`
**Fancy:** `-d46XTdNSIodRSplhrxlLQ`
**Cookie Secret:** `oKjyk2zz2zv40NqzBHeA5Om8txmVVmtPCw65hy2dJ9E`

## Railway Configuration Required

### Environment Variables (Set in Railway Dashboard)
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `SUPABASE_BUCKET` - Set to `client-data`
- `PORT` - Auto-provided by Railway

### Start Command
Ensure Railway service has start command:
```
uvicorn main:app --host 0.0.0.0 --port $PORT
```

### Current Status
- Service: `htx_tap_dashboard` in project `keen-nurturing`
- URL: https://htxtapdashboard-production.up.railway.app
- Status: 502 error (needs deployment/configuration)

## Vercel Configuration Required

### Project Setup
1. Create project: `htx-tap-portal` in Vercel
2. Connect repo: `Matty-1337/htx_tap_dashboard`
3. Set Root Directory: `web`
4. Framework: Next.js (auto-detected)

### Environment Variables (Set in Vercel Dashboard)
- `NEXT_PUBLIC_API_BASE_URL` = `https://htxtapdashboard-production.up.railway.app`
- `LOGIN_CODE_MELROSE` = `IfS9OobcCPl6k9uqS0L7eQ`
- `LOGIN_CODE_BESTREGARD` = `PugeCy9r2LYWRUqoC6Q4nQ`
- `LOGIN_CODE_FANCY` = `-d46XTdNSIodRSplhrxlLQ`
- `COOKIE_SECRET` = `oKjyk2zz2zv40NqzBHeA5Om8txmVVmtPCw65hy2dJ9E`

## Testing Checklist

### Railway Backend
1. ✅ Health: `GET https://htxtapdashboard-production.up.railway.app/health`
2. ⚠️ Run: `POST https://htxtapdashboard-production.up.railway.app/run` with `{"clientId":"melrose"}`
   - Current: 502 error (service not running)

### Vercel Frontend
1. ⏳ Deploy project with root directory `/web`
2. ⏳ Test `/login` page
3. ⏳ Test login flow with Melrose code
4. ⏳ Verify dashboard loads data

## Next Steps

1. **Railway**: 
   - Verify environment variables are set
   - Check start command is correct
   - Trigger redeploy (push to main or manual redeploy)
   - Verify service is running

2. **Vercel**:
   - Create project via dashboard or CLI
   - Set root directory to `web`
   - Set all environment variables
   - Deploy

3. **CORS**: Already configured in `main.py` to allow `*.vercel.app` domains
