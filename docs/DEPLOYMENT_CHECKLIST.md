# Deployment Checklist: ISM Salary System

## Phase 1: GitHub Repository Setup (5 min)

- [ ] Go to repository → **Settings → Secrets and variables → Actions**
- [ ] Add these 3 secrets:

| Secret Name | Example Value | Notes |
|-------------|---------------|-------|
| `SSH_PRIVATE_KEY` | (paste entire private key) | Keep secure! |
| `VPS_HOST` | `203.0.113.42` | Or `salary.ismgroup.lk` after DNS is ready |
| `VPS_USER` | `deploy` | SSH user on VPS |

**Note:** Deployment paths (`/var/www/ism-client`, `/home/deploy/ism-server`) and PM2 process name (`ism-server`) are **hardcoded in the workflows** — no secrets needed for these!

- [ ] Verify workflows exist (check `.github/workflows/` folder):
  - `client-deploy.yml` ✓
  - `server-deploy.yml` ✓
  - `lint-workflows.yml` ✓

---

## Phase 2: DNS Setup (10-30 min, wait for propagation)

**Your Domain:** `ismgroup.lk`  
**Subdomains:**
- `salary.ismgroup.lk` → Client (React app)
- `api.salary.ismgroup.lk` → API backend (Node.js)

### Step 1: Get VPS IP
```bash
# On your VPS or ask provider
curl -s http://ifconfig.me
# Output example: 203.0.113.42
```

### Step 2: Add DNS records (2 A records)
- Login to your domain registrar (NameSilo, GoDaddy, etc.)
- Go to DNS settings for `ismgroup.lk`
- **Add first A record (client):**
  - Type: `A`
  - Name: `salary`
  - Value: `203.0.113.42` (your VPS IP)
  - TTL: `3600` (or Auto)
- **Add second A record (API):**
  - Type: `A`
  - Name: `api.salary` (or just `api` depending on registrar)
  - Value: `203.0.113.42` (same VPS IP)
  - TTL: `3600` (or Auto)
- Click Save/Update

### Step 3: Wait & verify
```bash
# Wait 5-30 minutes, then test:
nslookup salary.ismgroup.lk
# Should show: Address: 203.0.113.42

nslookup api.salary.ismgroup.lk
# Should show: Address: 203.0.113.42
```

---

## Phase 3: VPS Setup (30 min)

### SSH into VPS
```bash
ssh deploy@salary.ismgroup.lk
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

PORT=5002
NODE_ENV=production
CLIENT_URL=https://salary.ismgroup.lk

JWT_SECRET=YOUR_LONG_RANDOM_SECRET
JWT_EXPIRES_IN=8h

AUDIT_LOG_PASSKEY=400250ISM
EOF

chmod 600 /home/deploy/ism-server/.env
```

**Note:** `CLIENT_URL` points to the client subdomain (`salary.ismgroup.lk`). The server runs on `localhost:5002` and is proxied by Nginx from `api.salary.ismgroup.lk`.

---

## Phase 5: Nginx Configuration (10 min)

Create Nginx config with two separate server blocks (one for client, one for API):
```bash
sudo cat > /etc/nginx/sites-available/ism-salary << 'EOF'
# ============ CLIENT: salary.ismgroup.lk ============
server {
    listen 80;
    listen [::]:80;
    server_name salary.ismgroup.lk;

    # Client static files (React app)
    location / {
        root /var/www/ism-client;
        try_files $uri $uri/ /index.html;
        expires 1h;
        add_header Cache-Control "public, max-age=3600";
    }

    location ~ /\. {
        deny all;
    }
}

# ============ API: api.salary.ismgroup.lk ============
server {
    listen 80;
    listen [::]:80;
    server_name api.salary.ismgroup.lk;

    # All traffic to backend
    location / {
        proxy_pass http://localhost:5002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
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

## Phase 6: SSL Certificates (5-10 min)

Generate SSL certificates for **both subdomains**:

```bash
# Certbot will update the Nginx file and add redirects to HTTPS
sudo certbot --nginx -d salary.ismgroup.lk --redirect
sudo certbot --nginx -d api.salary.ismgroup.lk --redirect
```

Follow prompts. Certbot will create certificates and update the matching
server blocks automatically.

Verify SSL:
```bash
curl -I https://salary.ismgroup.lk
curl -I https://api.salary.ismgroup.lk/health
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
# Client should load
curl -I https://salary.ismgroup.lk

# API health check (if backend has /health endpoint)
curl https://api.salary.ismgroup.lk/health
```

---

## Phase 10: Verification

✓ All done? Check these:

```bash
# From your local machine:
curl -I https://salary.ismgroup.lk                    # Client should return 200
curl -I https://api.salary.ismgroup.lk                # API should return 200 or API response

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
|---------|----------|
| DNS not working | Wait 30 min, check **both A records** in registrar, verify `nslookup salary.ismgroup.lk` and `nslookup api.salary.ismgroup.lk` |
| 502 Bad Gateway on api subdomain | SSH to VPS, run `pm2 status` and `pm2 logs ism-server` |
| SSL not working | Run `sudo certbot --nginx -d salary.ismgroup.lk --redirect` and `sudo certbot --nginx -d api.salary.ismgroup.lk --redirect` |
| Client page returns 404 | Check files in `/var/www/ism-client`, run client workflow |
| API fails to respond | Check Nginx proxy config, verify backend runs on `localhost:5002` |
| GitHub Actions fails | Check Secret values, verify SSH key permissions (600), check action logs |

---

## Next: Monitoring & Backups

See [VPS_DEPLOYMENT_COMPLETE_GUIDE.md](VPS_DEPLOYMENT_COMPLETE_GUIDE.md) for:
- Health checks & monitoring
- Database backups
- Log rotation
- SSL auto-renewal
