# Railway Branch Configuration Fix

## ✅ STATUS: RESOLVED (January 2, 2026)

All issues have been fixed. The full pipeline is now working:
**GitHub** → **Supabase** → **Python** → **Railway** → **Vercel**

---

## Problem Identified (FIXED)

**Root Cause**: Railway was deploying from the wrong GitHub branch AND missing function definitions.

### Current Situation

1. **`analysis_minimal.py` exists on `master` branch** ✅
2. **`analysis_minimal.py` does NOT exist on `main` branch** ❌
3. **Railway is likely deploying from `main`** (default branch) ❌
4. **Result**: Railway deployment is missing critical backend files, causing 500 errors

### Branch Status

```
Local branch: master
Remote branches:
  - origin/main (default branch, missing analysis_minimal.py)
  - origin/master (has analysis_minimal.py + 10 commits ahead)
```

**Commits on `master` but NOT on `main`**:
- `0ec6b82` - feat: add tab name correlation charts
- `39823d5` - Fix duplicate file entries
- `77d2b8b` - Fix revenue heatmap: Central Time Zone
- `afa54fb` - Add pytz dependency
- `2b53f24` - Fix timezone issue
- `801ec4e` - feat: major dashboard enhancements
- `2a74f0c` - fix: exclude voids from heatmap
- `aae38ef` - fix: shift 12AM-2AM to previous day
- `2351f93` - fix: add revenue_heatmap
- `c3391b4` - fix: remove duplicate frontend/ folder

---

## Solution Options

### Option 1: Configure Railway to Deploy from `master` Branch (Recommended)

**Steps**:

1. **Open Railway Dashboard**
   - Go to https://railway.app
   - Navigate to your project: `htx_tap_dashboard`
   - Click on the service (backend service)

2. **Access Service Settings**
   - Click on the **Settings** tab
   - Scroll to **Service Source** section

3. **Change Deployment Branch**
   - If repository is already connected:
     - Click **"Disconnect"** to disconnect the current connection
     - Click **"Connect Repo"** again
   - Select your GitHub repository
   - **IMPORTANT**: When connecting, specify the branch as **`master`** (not `main`)
   - Railway will now deploy from `master` branch automatically

4. **Verify Deployment**
   - Railway should automatically trigger a new deployment
   - Check the **Deploy Logs** to confirm it's building from `master`
   - Verify `analysis_minimal.py` is present in the build

5. **Test the Fix**
   ```powershell
   # Health check
   Invoke-RestMethod -Uri "https://htxtapdashboard-production.up.railway.app/health" -Method GET
   
   # Test /run endpoint
   $body = @{
       clientId = "melrose"
       params = @{
           dateRange = @{
               preset = "30d"
           }
       }
   } | ConvertTo-Json -Depth 10
   
   Invoke-RestMethod -Uri "https://htxtapdashboard-production.up.railway.app/run" -Method POST -ContentType "application/json" -Body $body
   ```

---

### Option 2: Merge `master` into `main` (Alternative)

If you prefer to keep Railway deploying from `main`, merge `master` into `main`:

**Steps**:

1. **Switch to main branch locally**
   ```bash
   git checkout main
   git pull origin main
   ```

2. **Merge master into main**
   ```bash
   git merge origin/master
   ```

3. **Resolve any conflicts** (if any)

4. **Push to main**
   ```bash
   git push origin main
   ```

5. **Railway will auto-deploy** from `main` with the updated code

**Note**: This approach keeps `main` as the default branch, but requires merging `master` regularly.

---

## Verification Checklist

After applying the fix, verify:

- [ ] Railway service is connected to correct branch (`master` or updated `main`)
- [ ] Railway Deploy Logs show deployment from correct branch
- [ ] Health check returns `{"ok": true}`
- [ ] `/run` endpoint returns 200 (not 500)
- [ ] Response includes `charts.hour_of_day` and `charts.day_of_week`
- [ ] No errors in Railway logs about missing `analysis_minimal.py`

---

## Current Error Analysis

### Log Evidence

From the Railway logs (`logs.1767322082140.log`):

```
Line 78:  INFO:     100.64.0.2:45234 - "POST /run HTTP/1.1" 500 Internal Server Error
Line 149: INFO:     100.64.0.2:45234 - "POST /run HTTP/1.1" 500 Internal Server Error
Line 220: INFO:     100.64.0.2:45234 - "POST /run HTTP/1.1" 500 Internal Server Error
Line 291: INFO:     100.64.0.2:45234 - "POST /run HTTP/1.1" 500 Internal Server Error
```

**Observations**:
- Application starts successfully ✅
- Data loading works (Supabase connection OK) ✅
- Analysis pipeline runs (data processing visible) ✅
- **500 error occurs after processing** ❌

**Possible causes**:
1. **Missing `analysis_minimal.py`** (most likely - file not in deployed branch)
2. Import error when trying to use `analysis_minimal` module
3. Exception during response serialization

**Note**: The logs show the code IS running (we see analysis logs), which suggests the file might exist but there's an exception being caught. However, the user's statement that `analysis_minimal.py` is on `web` branch (which we don't see) suggests Railway might be deploying from a branch without the file.

---

## Recommended Action Plan

1. **Immediate**: Configure Railway to deploy from `master` branch (Option 1)
2. **Verify**: Check Railway Deploy Logs to confirm branch
3. **Test**: Run health check and `/run` endpoint
4. **Monitor**: Watch Railway logs for any remaining errors
5. **Long-term**: Consider standardizing on one branch (`main` or `master`) to avoid future confusion

---

## Railway Branch Configuration Reference

According to Railway documentation:

- Railway defaults to the **default branch** of your GitHub repository
- The default branch is typically `main` (GitHub's new default)
- You can change the deployment branch in **Service Settings → Service Source**
- Railway will auto-deploy when commits are pushed to the configured branch

**To verify current branch in Railway**:
1. Go to Railway Dashboard → Your Service
2. Click **Settings** tab
3. Check **Service Source** section
4. It will show: "Connected to [repo] on branch [branch-name]"

---

## Additional Debugging

If issues persist after fixing the branch:

1. **Check Railway Build Logs**:
   - Railway Dashboard → Service → Deploy Logs
   - Look for file listing or build output
   - Verify `analysis_minimal.py` is present

2. **Check Railway Runtime Logs**:
   - Railway Dashboard → Service → Logs
   - Look for import errors or file not found errors

3. **Verify File Structure**:
   ```bash
   # In Railway, check if file exists (via SSH or logs)
   ls -la /app/analysis_minimal.py
   ```

4. **Test Import Locally**:
   ```bash
   python -c "from analysis_minimal import run_full_analysis; print('OK')"
   ```

---

## Summary

**The Problem**: Railway is deploying from `main` branch, but `analysis_minimal.py` only exists on `master` branch.

**The Solution**: Configure Railway to deploy from `master` branch, or merge `master` into `main`.

**Priority**: **HIGH** - This is blocking production deployments and causing 500 errors.
