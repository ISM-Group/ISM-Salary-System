# Deployment Checklist: ISM Salary System

## Phase 1: GitHub Repository Setup (5 min)

- [ ] Go to repository → **Settings → Secrets and variables → Actions**
- [ ] Add these 3 secrets:

| Secret Name | Example Value | Notes |
|-------------|---------------|-------|
| `SSH_PRIVATE_KEY` | (paste entire private key) | Keep secure! |
| `VPS_HOST` | `203.0.113.42` | Or `salary.ismgroups.lk` after DNS is ready |
| `VPS_USER` | `deploy` | SSH user on VPS |

**Note:** Deployment paths (`/var/www/ism-client`, `/home/deploy/ism-server`) and PM2 process name (`ism-server`) are **hardcoded in the workflows** — no secrets needed for these!

- [ ] Verify workflows exist (check `.github/workflows/` folder):
  - `client-deploy.yml` ✓
  - `server-deploy.yml` ✓
  - `lint-workflows.yml` ✓

---

## Phase 2: DNS Setup (10-30 min, wait for propagation)

**Your Domain:** `ismgroups.lk`  
**Subdomain:** `salary.ismgroups.lk`

### Step 1: Get VPS IP
```bash
# On your VPS or ask provider
curl -s http://ifconfig.me
# Output example: 203.0.113.42
```

### Step 2: Add DNS record
- Login to your domain registrar (NameSilo, GoDaddy, etc.)
- Go to DNS settings for `ismgroups.lk`
- **Add A record:**
  - Type: `A`
  - Name: `salary`
  - Value: `203.0.113.42` (your VPS IP)
  - TTL: `3600` (or Auto)
- Click Save/Update

### Step 3: Wait & verify
```bash
# Wait 5-30 minutes, then test:
nslookup salary.ismgroups.lk
# Should show: Address: 203.0.113.42
```

---

## Phase 3: VPS Setup (30 min)

### SSH into VPS
```bash
ssh deploy@salary.ismgroups.lk
# If DNS not ready yet:
ssh deploy@203.0.113.42
```

### Create directories
```bash
sudo mkdir -p /var/www/ism-client
sudo mkdir -p /home/deploy/ism-server/logs
sudo chown -R deploy:deploy /var/www/ism-client
sudo chown -R deploy:deploy /home/deploy/ism-server
```

### Install Node.js (if not installed)
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs build-essential
```

### Install PM2 globally
```bash
sudo npm install -g pm2
pm2 startup
pm2 save
```

### Install Nginx & Certbot
```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

---

## Phase 4: Server Environment Variables (5 min)

On your VPS, create production `.env`:

```bash
cat > /home/deploy/ism-server/.env << 'EOF'
DATABASE_HOST=127.0.0.1
DATABASE_PORT=3306
DATABASE_USER=mrfawz_user
DATABASE_PASSWORD=YOUR_PRODUCTION_PASSWORD
DATABASE_NAME=ISM_salary

PORT=5001
NODE_ENV=production
CLIENT_URL=https://salary.ismgroups.lk

JWT_SECRET=YOUR_LONG_RANDOM_SECRET
JWT_EXPIRES_IN=8h

AUDIT_LOG_PASSKEY=400250ISM
EOF

chmod 600 /home/deploy/ism-server/.env
```

**Generate JWT_SECRET:**
```bash
openssl rand -base64 32
```

---

## Phase 5: Nginx Configuration (10 min)

Create Nginx config:
```bash
sudo cat > /etc/nginx/sites-available/ism-salary << 'EOF'
# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name salary.ismgroups.lk;
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name salary.ismgroups.lk;

    ssl_certificate /etc/letsencrypt/live/salary.ismgroups.lk/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/salary.ismgroups.lk/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Client static files
    location / {
        root /var/www/ism-client;
        try_files $uri $uri/ /index.html;
        expires 1h;
        add_header Cache-Control "public, max-age=3600";
    }

    # API proxy to backend
    location /api/ {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /health {
        proxy_pass http://localhost:5001/health;
        access_log off;
    }

    location ~ /\. {
        deny all;
    }
    location ~ /\.env {
        deny all;
    }
}
EOF
```

Enable and test:
```bash
sudo ln -s /etc/nginx/sites-available/ism-salary /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Phase 6: SSL Certificate (5 min)

```bash
sudo certbot certonly --nginx -d salary.ismgroups.lk
# Follow prompts, select standalone or nginx method
# Certificates installed to: /etc/letsencrypt/live/salary.ismgroups.lk/
```

Verify SSL:
```bash
curl -I https://salary.ismgroups.lk
# Should return 200 OK or 404 (if no files yet)
```

---

## Phase 7: MySQL Database (10 min)

```bash
# Create database
mysql -u root -p

# In MySQL prompt:
CREATE DATABASE ISM_salary;
CREATE USER 'mrfawz_user'@'localhost' IDENTIFIED BY 'YOUR_PROD_PASSWORD';
GRANT ALL PRIVILEGES ON ISM_salary.* TO 'mrfawz_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Import schema (if you have it)
mysql -u mrfawz_user -p ISM_salary < COMPLETE_SETUP.sql
```

---

## Phase 8: First Manual Deployment (optional, for testing)

```bash
cd /home/deploy/ism-server
npm ci --production
npm run build  # or if already built, just use existing dist/
pm2 start dist/server.js --name ism-server
pm2 save
```

Check if running:
```bash
pm2 status
pm2 logs ism-server
```

---

## Phase 9: Push to GitHub & Auto-Deploy

On your local machine:
```bash
git add .
git commit -m "Setup for VPS deployment"
git push origin main
```

Watch GitHub Actions:
1. Go to repo → **Actions** tab
2. See workflows running
3. Client workflow syncs to `/var/www/ism-client`
4. Server workflow syncs to `/home/deploy/ism-server` and restarts PM2

Check live:
```bash
curl -I https://salary.ismgroups.lk
curl https://salary.ismgroups.lk/api/health
```

---

## Phase 10: Verification

✓ All done? Check these:

```bash
# From your local machine:
curl -I https://salary.ismgroups.lk                    # Should return 200
curl https://salary.ismgroups.lk/api/health            # Should return API response

# SSH to VPS and check:
pm2 status                                              # ism-server should be online
sudo systemctl status nginx                             # Should be active
sudo tail -f /var/log/nginx/error.log                   # No errors
mysql -u mrfawz_user -p -e "SELECT VERSION();"         # Database connected
```

---

## Quick Command Reference

### On VPS

```bash
# Check everything
pm2 monit                           # Monitor processes
pm2 logs ism-server                 # View server logs
sudo tail -f /var/log/nginx/error.log  # Nginx errors

# Restart services
pm2 restart ism-server
sudo systemctl reload nginx
sudo systemctl restart nginx

# Database
mysql -u root -p
mysql -u mrfawz_user -p ISM_salary

# SSL renewal
sudo certbot renew --dry-run
```

### On local machine (push to deploy)

```bash
git push origin main                # Triggers GitHub Actions
# Watch Actions tab for workflow completion
```

---

## Troubleshooting Quick Fixes

| Problem | Quick Fix |
|---------|-----------|
| DNS not working | Wait 30 min, check A record in registrar, verify `nslookup salary.ismgroups.lk` |
| 502 Bad Gateway | SSH to VPS, run `pm2 status` and `pm2 logs ism-server` |
| SSL not working | Run `sudo certbot certonly --nginx -d salary.ismgroups.lk` again |
| Nginx returns 404 | Check files in `/var/www/ism-client`, run client workflow |
| API fails | Check Nginx proxy config, verify backend runs on `localhost:5001` |
| GitHub Actions fails | Check Secret values, verify SSH key permissions (600), check action logs |

---

## Next: Monitoring & Backups

See [VPS_DEPLOYMENT_COMPLETE_GUIDE.md](VPS_DEPLOYMENT_COMPLETE_GUIDE.md) for:
- Health checks & monitoring
- Database backups
- Log rotation
- SSL auto-renewal
