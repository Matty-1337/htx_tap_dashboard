# Vercel Wildcard Domain Fix Instructions

## Issue
`*.htxtap.com` shows "INVALID CONFIGURATION" in Vercel project `htx-tap-portal`

## Root Cause Analysis
- DNS is correctly configured (wildcard CNAME exists)
- No Namecheap URL redirect records
- Likely cause: Domain assignment conflict or Vercel validation issue

## Step-by-Step Fix

### Step 1: Refresh Domain in Vercel
1. Go to: https://vercel.com/mattys-projects-7bbe0a37/htx-tap-portal/settings/domains
2. Find `*.htxtap.com` in the domain list
3. Click **"Refresh"** button next to it
4. Wait 1-2 minutes
5. Check if status changes to "Valid Configuration"

### Step 2: If Still Invalid - Remove and Re-add
1. In the same Domains page, find `*.htxtap.com`
2. Click the **"..."** menu (three dots) next to it
3. Select **"Remove"** or **"Delete"**
4. Confirm removal
5. Wait 30 seconds
6. Click **"Add Domain"** button
7. Enter: `*.htxtap.com`
8. Click **"Add"**
9. Note any error messages, especially:
   - "Domain already in use"
   - "Domain assigned to another project"
   - "Domain assigned to another team"

### Step 3: If Domain is Assigned Elsewhere
If Vercel reports the domain is assigned to another project:

1. **Search All Projects:**
   - Go to: https://vercel.com/mattys-projects-7bbe0a37
   - Check each project's Settings → Domains
   - Look for `*.htxtap.com` or `htxtap.com` in any project

2. **Check Other Projects Found:**
   - `flow-engine-frontend` (prj_mKSXWHpKA8NhRmNuEoCWbKeLpNqc)
   - Any other projects in the team

3. **Remove from Conflicting Project:**
   - Go to the conflicting project's Settings → Domains
   - Remove `*.htxtap.com` or `htxtap.com`
   - Confirm removal

4. **Re-add to htx-tap-portal:**
   - Return to: https://vercel.com/mattys-projects-7bbe0a37/htx-tap-portal/settings/domains
   - Add `*.htxtap.com` again
   - Click **"Refresh"** until it shows "Valid Configuration"

### Step 4: Verify SSL Provisioning
After `*.htxtap.com` shows "Valid Configuration":
1. Wait 5-10 minutes for SSL certificate provisioning
2. Check that SSL status changes to "Valid Certificate"
3. If SSL is still pending after 10 minutes, click "Refresh" again

### Step 5: Test HTTPS Connectivity
Once both Domain Status and SSL Status are "Valid", test:
- https://admin.htxtap.com
- https://melrose.htxtap.com
- https://fancy.htxtap.com
- https://bestregard.htxtap.com

## Expected Timeline
- Domain refresh: 1-2 minutes
- Domain removal/re-add: 30 seconds
- SSL provisioning: 5-10 minutes after validation

## Verification Checklist
- [ ] `*.htxtap.com` shows "Valid Configuration" in Vercel
- [ ] `*.htxtap.com` shows "Valid Certificate" in Vercel
- [ ] All subdomains resolve via HTTPS
- [ ] No SSL certificate errors in browser
- [ ] Pages load correctly for each subdomain
