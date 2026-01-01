# DNS Diagnosis & Fix Instructions for *.htxtap.com

## Current DNS Status (from nslookup)

### ✅ CORRECTLY CONFIGURED:
- **Apex domain (htxtap.com)**: A record → `76.76.21.21` ✓
- **Wildcard (*.htxtap.com)**: CNAME → `cname.vercel-dns.com` ✓
- **admin.htxtap.com**: CNAME → `cname.vercel-dns.com` ✓
- **melrose.htxtap.com**: CNAME → `cname.vercel-dns.com` ✓
- **www.htxtap.com**: CNAME → `cname.vercel-dns.com` ✓

### ⚠️ POTENTIAL CONFLICTS:
- **MX records**: Present (smtp.google.com) - OK, won't conflict
- **TXT records**: Present (SPF, Google verification, Zoho) - OK, won't conflict
- **NS records**: Using Namecheap nameservers (pdns1/2.registrar-servers.com) - OK

## Root Cause Analysis

The `*.htxtap.com` wildcard shows "INVALID CONFIGURATION" in Vercel likely due to:

1. **Namecheap URL Redirect Records**: If `htxtap.com` has a URL Redirect record (307 redirect to www.htxtap.com), this can conflict with wildcard validation
2. **Wildcard CNAME in Namecheap**: The wildcard CNAME might not be properly saved or recognized by Namecheap's DNS system
3. **DNS Propagation**: The wildcard CNAME might not have fully propagated to Vercel's DNS validation servers

## Required Namecheap Advanced DNS Configuration

### Exact DNS Records Needed:

| Type | Host | Value | TTL |
|------|------|-------|-----|
| A | @ | 76.76.21.21 | Automatic (or 300) |
| CNAME | * | cname.vercel-dns.com | Automatic (or 300) |
| CNAME | www | cname.vercel-dns.com | Automatic (or 300) |
| CNAME | admin | cname.vercel-dns.com | Automatic (or 300) |
| MX | @ | smtp.google.com (Priority 10) | Keep existing |
| TXT | @ | (Keep existing: SPF, Google verification, Zoho) | Keep existing |

### ⚠️ CRITICAL: Records to REMOVE/Disable:

1. **URL Redirect Records** (if present):
   - Remove any "URL Redirect" record for `htxtap.com` → `www.htxtap.com`
   - Remove any "URL Redirect" record for `@` → `www`
   - These conflict with wildcard CNAME validation

2. **Conflicting Wildcard Records**:
   - Remove any other CNAME record with host `*` pointing to a different value
   - Remove any A record with host `*`

3. **A Record for www** (if present):
   - If `www.htxtap.com` has an A record, remove it (use CNAME instead)

## Step-by-Step Fix Instructions

### Step 1: Access Namecheap DNS
1. Log in to Namecheap
2. Go to **Domain List** → Select `htxtap.com`
3. Click **Advanced DNS** tab

### Step 2: Remove Conflicting Records
1. Look for **URL Redirect Records** section
2. If `htxtap.com` redirects to `www.htxtap.com`, **DISABLE or DELETE** it
3. Check for any other redirect records and remove them

### Step 3: Verify Wildcard CNAME
1. In **Host Records** section, find the CNAME record with:
   - **Host**: `*`
   - **Value**: `cname.vercel-dns.com`
2. If it doesn't exist, **ADD** it:
   - Type: `CNAME Record`
   - Host: `*`
   - Value: `cname.vercel-dns.com`
   - TTL: `Automatic` or `300`
3. If it exists but value is different, **EDIT** it to `cname.vercel-dns.com`

### Step 4: Verify Apex A Record
1. Ensure A record exists:
   - Type: `A Record`
   - Host: `@`
   - Value: `76.76.21.21`
   - TTL: `Automatic` or `300`

### Step 5: Save and Wait
1. Click **Save All Changes**
2. Wait 5-10 minutes for DNS propagation

### Step 6: Refresh in Vercel
1. Go to: https://vercel.com/mattys-projects-7bbe0a37/htx-tap-portal/settings/domains
2. Find `*.htxtap.com` in the domain list
3. Click **"Refresh"** button next to it
4. Wait 1-2 minutes
5. Verify status changes to:
   - **Domain Status**: ✅ "Valid Configuration"
   - **SSL Status**: ✅ "Valid Certificate" (may take 5-10 minutes after validation)

## Expected Timeline

- **DNS Propagation**: 5-10 minutes
- **Vercel Validation**: 1-2 minutes after refresh
- **SSL Certificate Provisioning**: 5-10 minutes after validation

## Verification Checklist

After completing the fix:
- [ ] `*.htxtap.com` shows "Valid Configuration" in Vercel
- [ ] `*.htxtap.com` shows "Valid Certificate" in Vercel
- [ ] `admin.htxtap.com` shows "Valid Configuration" in Vercel
- [ ] `htxtap.com` shows "Valid Configuration" in Vercel
- [ ] `www.htxtap.com` shows "Valid Configuration" in Vercel
