# Quick Deployment Start Guide

## Phase 1: Prepare GitHub Secrets (5 min)

Go to your GitHub repo → **Settings → Secrets and variables → Actions**

Add 3 secrets:

| Secret Name | Value |
|------------|-------|
| `SSH_PRIVATE_KEY` | Your VPS deploy user's private key (PEM format) |
| `VPS_HOST` | Your VPS IP (e.g., `203.0.113.42`) |
| `VPS_USER` | Deploy user on VPS (e.g., `deploy` or `sasindu`) |

**Get your private key:**
```bash
cat ~/.ssh/id_rsa_deploy   # on your local machine
# Copy entire output → paste into SSH_PRIVATE_KEY secret
```

---

## Phase 2: Setup DNS (10 min + 5-30 min propagation)

Login to your domain registrar (ismgroups.lk).

Add these A records:

| Name | Type | Value | TTL |
|------|------|-------|-----|
| `salary` | A | YOUR_VPS_IP | 3600 |
| `api.salary` | A | YOUR_VPS_IP | 3600 |

**Verify DNS works:**
```bash
nslookup salary.ismgroups.lk
nslookup api.salary.ismgroups.lk
# Both should show your VPS IP
```

---

## Phase 3: Setup VPS Directories (5 min)

SSH into your VPS:
```bash
ssh deploy@salary.ismgroups.lk  # (or use your VPS IP if DNS not ready)
```

Create directories (use `prepare_vps.sh` script or run manually):

```bash
# Create directories and set permissions
sudo mkdir -p /var/www/ism-client /var/www/ism-client-backup /home/deploy/ism-server
sudo chown -R deploy:deploy /var/www/ism-client /var/www/ism-client-backup /home/deploy/ism-server
sudo chmod -R 0755 /var/www/ism-client /var/www/ism-client-backup /home/deploy/ism-server

# Verify
ls -ld /var/www/ism-client /home/deploy/ism-server
```

---

## Phase 4: Setup Nginx + SSL (15 min)

**On your VPS:**

### 1. Install Nginx & Certbot

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

### 2. Create Nginx config

```bash
sudo tee /etc/nginx/sites-available/ism-salary > /dev/null <<'EOF'
# ============ CLIENT: salary.ismgroups.lk ============
server {
    listen 80;
    listen [::]:80;
    server_name salary.ismgroups.lk;
    
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

# ============ API: api.salary.ismgroups.lk ============
server {
    listen 80;
    listen [::]:80;
    server_name api.salary.ismgroups.lk;
    
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

### 3. Enable and test Nginx

```bash
sudo ln -s /etc/nginx/sites-available/ism-salary /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4. Create SSL certificates with Certbot

```bash
# Certbot will add HTTPS server blocks and HTTP->HTTPS redirects
sudo certbot --nginx -d salary.ismgroups.lk --redirect
sudo certbot --nginx -d api.salary.ismgroups.lk --redirect
```

**Verify SSL works:**
```bash
curl -I https://salary.ismgroups.lk
curl -I https://api.salary.ismgroups.lk/health
# Should return 200/301 with SSL info
```

---

## Phase 5: Setup Database (10 min)

**On your VPS:**

### 1. Install MySQL

```bash
sudo apt install -y mysql-server
sudo mysql_secure_installation
```

### 2. Create database

```bash
mysql -u root -p
```

Paste this SQL:
```sql
CREATE DATABASE ISM_salary;
CREATE USER 'mrfawz_user'@'127.0.0.1' IDENTIFIED BY 'MrFawz2026';
GRANT ALL PRIVILEGES ON ISM_salary.* TO 'mrfawz_user'@'127.0.0.1';
FLUSH PRIVILEGES;
EXIT;
```

### 3. Load schema (copy PROD_DATABASE_SETUP.sql to VPS first)

```bash
# From your local machine:
scp PROD_DATABASE_SETUP.sql deploy@salary.ismgroups.lk:/tmp/

# On VPS:
mysql -u mrfawz_user -pMrFawz2026 ISM_salary < /tmp/PROD_DATABASE_SETUP.sql

# Optional: Load seed data
mysql -u mrfawz_user -pMrFawz2026 ISM_salary < /tmp/PROD_SEED_DATA.sql
```

---

## Phase 6: Setup PM2 (5 min)

**On your VPS:**

```bash
# Install PM2 globally
sudo npm install -g pm2

# Create logs directory
mkdir -p /home/deploy/ism-server/logs

# Start server manually first (do this after first deployment)
cd /home/deploy/ism-server
pm2 start dist/server.js --name ism-server
pm2 save
pm2 startup
```

---

## Phase 7: Create Server .env (5 min)

**On your VPS:**

```bash
cat > /home/deploy/ism-server/.env << 'EOF'
DATABASE_HOST=127.0.0.1
DATABASE_PORT=3306
DATABASE_USER=mrfawz_user
DATABASE_PASSWORD=MrFawz2026
DATABASE_NAME=ISM_salary

PORT=5002
NODE_ENV=production
CLIENT_URL=https://salary.ismgroups.lk

JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRES_IN=8h

AUDIT_LOG_PASSKEY=400250ISM
EOF

chmod 600 /home/deploy/ism-server/.env
```

---

## Phase 8: First Deployment (5 min)

**From your local machine:**

```bash
# Commit and push to main
git add .
git commit -m "chore: setup workflows and VPS deployment"
git push origin main
```

**Then:**
1. Go to GitHub → **Actions**
2. Manually trigger both workflows OR wait for automatic trigger
3. Monitor logs → look for ✅ success or ❌ errors
4. Test endpoints:
   ```bash
   # Client
   curl -I https://salary.ismgroups.lk
   
   # API (should proxy to backend)
   curl https://api.salary.ismgroups.lk/health
   ```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Permission denied" on `/var/www` | Run VPS setup phase again with correct user |
| DNS not resolving | Wait 30 min for TTL to expire, then `nslookup salary.ismgroups.lk` |
| SSL certificate error | Ensure DNS A records are correct and set before running Certbot |
| PM2 process won't start | Check server logs: `pm2 logs ism-server` |
| 502 Bad Gateway from Nginx | Verify Node.js running: `pm2 info ism-server` |

---

## Full Documentation

- **DNS Setup**: [docs/VPS_DEPLOYMENT_COMPLETE_GUIDE.md](docs/VPS_DEPLOYMENT_COMPLETE_GUIDE.md#2-dns-records-setup)
- **Nginx Config**: [docs/VPS_DEPLOYMENT_COMPLETE_GUIDE.md#4-nginx-configuration)
- **Database**: [PROD_DATABASE_DEPLOYMENT_GUIDE.sql](PROD_DATABASE_DEPLOYMENT_GUIDE.sql)
- **Deployment Checklist**: [docs/DEPLOYMENT_CHECKLIST.md](docs/DEPLOYMENT_CHECKLIST.md)
- **GitHub Actions**: [docs/GITHUB_ACTIONS_DEPLOY.md](docs/GITHUB_ACTIONS_DEPLOY.md)

---

## SSH Keys Quick Setup

If you don't have SSH keys yet:

```bash
# Local machine: Generate key
ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa_deploy -N ""

# Copy to VPS
ssh-copy-id -i ~/.ssh/id_rsa_deploy deploy@salary.ismgroups.lk

# Add to GitHub Secrets
cat ~/.ssh/id_rsa_deploy  # Copy output → SSH_PRIVATE_KEY secret
```
