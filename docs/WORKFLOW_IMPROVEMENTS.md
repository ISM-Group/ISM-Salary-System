# GitHub Actions Workflow Improvements

Based on your Mr.Fawz-Restaurant deployment patterns, I've updated the ISM-Salary-System workflows to use the proven, more robust approach.

## What Changed

### Old Approach (What We Had)
```
❌ webfactory/ssh-agent for key management
❌ rsync for file transfer  
❌ Direct SSH commands (manual orchestration)
❌ Less error handling and logging
```

### New Approach (What We're Using Now)
```
✅ appleboy/scp-action for file transfer (more reliable)
✅ appleboy/ssh-action for remote execution (cleaner API)
✅ tar.gz compression before transfer (atomic transfers)
✅ Backup before deployment (rollback capability)
✅ Better logging and error handling (set -e, info/error tags)
✅ Verification checks (validate deployment succeeded)
✅ Cleanup of temp files (no cruft left behind)
```

## Key Improvements

### 1. **File Transfer** 
- **Before:** `rsync` + SSH agent
- **After:** `appleboy/scp-action` (single, atomic transfer)
- **Benefit:** More reliable, no partial transfers

### 2. **Remote Execution**
- **Before:** Direct SSH commands in workflow
- **After:** `appleboy/ssh-action` (better error handling)
- **Benefit:** Structured remote scripts with `set -e` for fail-fast

### 3. **Build Compression**
- **Before:** Rsync streamed changes
- **After:** Compress `dist/` to tar.gz locally, transfer once
- **Benefit:** Atomic transfer, smaller payload, consistent state

### 4. **Backup & Rollback**
- **Before:** No backup
- **After:** Auto-backup before extraction, restore on failure
- **Benefit:** Safe deployments, no downtime on errors

### 5. **PM2 Management**
- **Before:** Direct `pm2 restart` command
- **After:** `ecosystem.config.js` + `pm2 startOrReload`
- **Benefit:** Centralized config, better process management

### 6. **Logging**
- **Before:** Silent execution
- **After:** `[INFO]`, `[SUCCESS]`, `[ERROR]` tags, structured output
- **Benefit:** Easy debugging, clear deployment status

## New Files Added

### `ecosystem.config.js`
Centralizes PM2 process configuration:
- Process name: `ism-server` (Node.js API)
- Process name: `ism-client` (static placeholder)
- Logs stored in `/home/deploy/ism-server/logs/`
- Auto-restart, memory limits, watch disabled in production

Example usage:
```bash
# Reload all processes
pm2 startOrReload ecosystem.config.js

# Reload specific process
pm2 startOrReload ecosystem.config.js --only ism-server --update-env

# View status
pm2 list
pm2 info ism-server
pm2 logs ism-server
```

## Workflow Triggers

Both workflows trigger on:
- Push to `main` with changes to `client/**` or `server/**`
- Workflow file changes (`.github/workflows/*.yml`)
- Manual trigger via `workflow_dispatch`

## Deployment Flow (Client)

1. **Checkout** → Get latest code
2. **Setup Node.js** → Version 18, with npm cache
3. **Build** → Vite build, remove node_modules
4. **Compress** → tar.gz of dist/
5. **Transfer** → SCP to `/tmp/client-deploy.tar.gz`
6. **Extract** → On VPS, backup current, extract new
7. **Verify** → Check dist/ exists
8. **Reload Nginx** → Zero-downtime deployment
9. **Cleanup** → Remove temp files

## Deployment Flow (Server)

1. **Checkout** → Get latest code
2. **Setup Node.js** → Version 18, with npm cache
3. **Build** → TypeScript to dist/, remove dev dependencies
4. **Compress** → tar.gz of dist/ + package.json
5. **Transfer** → SCP to `/tmp/server-deploy.tar.gz`
6. **Extract** → On VPS, backup current, extract new
7. **Verify** → Check dist/ exists
8. **Install** → npm ci --production
9. **Reload PM2** → Restart/start ism-server process
10. **Cleanup** → Remove temp files

## Secrets Required (Same as Before)

Only 3 secrets needed:
```
SSH_PRIVATE_KEY    → Deploy user's private key (PEM)
VPS_HOST           → 203.0.113.42 (or salary.ismgroup.lk after DNS)
VPS_USER           → deploy
```

## On the VPS

The workflows expect:
- `/var/www/ism-client` → client static files (Nginx serves from here)
- `/home/deploy/ism-server` → server app (PM2 manages this)
- `/home/deploy/ism-server/.env` → production env variables
- `/home/deploy/ism-server/logs/` → created auto, logs stored here
- PM2 installed globally
- Nginx configured for two subdomains

## Rollback (If Needed)

If a deployment goes wrong:

```bash
# Manual rollback on VPS
cd /var/www/ism-client
rm -rf dist
cp -r ism-client-backup dist

# Or for server
cd /home/deploy/ism-server
rm -rf dist node_modules
cp -r ../ism-server-backup/* .
npm ci --production
pm2 restart ism-server
```

## Testing Locally

You can test the tarball creation locally:
```bash
# Client
tar -czf client-deploy.tar.gz -C client dist/
tar -tzf client-deploy.tar.gz | head -20

# Server
tar -czf server-deploy.tar.gz -C server dist/ package.json
tar -tzf server-deploy.tar.gz | head -20
```

## Next Steps

1. Commit and push to `main`
2. Watch the Actions tab for deployment
3. Check VPS logs: `pm2 logs ism-server`
4. Test both subdomains:
   - `https://salary.ismgroup.lk` (client)
   - `https://api.salary.ismgroup.lk` (API)
