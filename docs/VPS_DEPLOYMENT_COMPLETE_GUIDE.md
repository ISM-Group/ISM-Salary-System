# Complete VPS Deployment Guide: ISM Salary System

This guide covers:
1. GitHub Actions secrets and environment setup
2. DNS records for subdomain (`salary.ismgroups.lk`)
3. VPS domain configuration (Nginx + SSL)
4. Server environment variables
5. Monitoring and health checks

---

## 1. GitHub Actions Setup

### Required Secrets (Only 3!)

Add these to your GitHub repository: **Settings → Secrets and variables → Actions → New repository secret**

```
SSH_PRIVATE_KEY           (PEM private key for deploy user)
VPS_HOST                  (IP address or hostname, e.g., 203.0.113.42)
VPS_USER                  (deploy user, e.g., deploy)
```

**Hardcoded in Workflows (no secrets needed):**
- Client deploy path: `/var/www/ism-client`
- Server deploy path: `/home/deploy/ism-server`
- PM2 process name: `ism-server`

### Workflow Triggers

- **Client workflow**: Triggered on push to `main` that modifies `client/**`
- **Server workflow**: Triggered on push to `main` that modifies `server/**`
- **Manual trigger**: Use "Run workflow" button in Actions tab (workflow_dispatch)

### Environment Variables in Workflows

These are already set in the workflows:

**Client:**
```yaml
env:
  CI: true
```

**Server:**
```yaml
env:
  NODE_ENV: production
```

---

## 2. DNS Records Setup for `salary.ismgroups.lk`

### Step 1: Get your VPS IP address

Ask your VPS provider or run:
```bash
curl -s http://ifconfig.me
```

### Step 2: Add DNS records in your domain registrar

Login to `ismgroups.lk` domain registrar (e.g., NameSilo, Godaddy, etc.).

**A record (required):**
```
Type:   A
Name:   salary          (or just @salary if using subdomain input)
Value:  YOUR_VPS_IP     (e.g., 203.0.113.42)
TTL:    3600            (1 hour, or Auto)
```

**Optional: AAAA record (IPv6, if your VPS has IPv6):**
```
Type:   AAAA
Name:   salary
Value:  YOUR_VPS_IPV6
TTL:    3600
```

### Step 3: Verify DNS propagation

Wait 5-30 minutes, then test:
```bash
nslookup salary.ismgroups.lk
# or
dig salary.ismgroups.lk
```

You should see your VPS IP in the output.

---

## 3. VPS Directory Structure & Setup

### Step 1: Create directories (as root or with sudo)

```bash
sudo mkdir -p /var/www/ism-client
sudo mkdir -p /home/deploy/ism-server
sudo mkdir -p /home/deploy/ism-server/logs

sudo chown -R deploy:deploy /var/www/ism-client
sudo chown -R deploy:deploy /home/deploy/ism-server
```

### Step 2: Create production `.env` for server

SSH into your VPS:
```bash
ssh deploy@salary.ismgroups.lk
# or ssh deploy@YOUR_VPS_IP if DNS not ready yet
```

Create `.env` file:
```bash
cat > /home/deploy/ism-server/.env << 'EOF'
DATABASE_HOST=127.0.0.1
DATABASE_PORT=3306
DATABASE_USER=mrfawz_user
DATABASE_PASSWORD=YOUR_PROD_PASSWORD    # Use a strong password in production
DATABASE_NAME=ISM_salary

PORT=5001
NODE_ENV=production
CLIENT_URL=https://salary.ismgroups.lk  # Use https in production

JWT_SECRET=YOUR_LONG_RANDOM_SECRET_KEY_HERE
JWT_EXPIRES_IN=8h

AUDIT_LOG_PASSKEY=400250ISM
EOF
chmod 600 /home/deploy/ism-server/.env
```

Generate a strong JWT_SECRET:
```bash
openssl rand -base64 32
```

---

## 4. Nginx Configuration

### Step 1: Install Nginx (if not already installed)

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

### Step 2: Create Nginx server block

Create file: `/etc/nginx/sites-available/ism-salary`

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name salary.ismgroups.lk;
    return 301 https://$server_name$request_uri;
}

# HTTPS server block
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name salary.ismgroups.lk;

    # SSL certificates (will be added by Certbot)
    ssl_certificate /etc/letsencrypt/live/salary.ismgroups.lk/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/salary.ismgroups.lk/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Client (static assets)
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
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint (optional)
    location /health {
        proxy_pass http://localhost:5001/health;
        access_log off;
    }

    # Deny access to sensitive files
    location ~ /\. {
        deny all;
    }
    location ~ /\.env {
        deny all;
    }
}
```

### Step 3: Enable the site

```bash
sudo ln -s /etc/nginx/sites-available/ism-salary /etc/nginx/sites-enabled/
sudo nginx -t          # Test config
sudo systemctl reload nginx
```

### Step 4: Setup SSL with Let's Encrypt (Certbot)

```bash
sudo certbot certonly --nginx -d salary.ismgroups.lk
```

Follow the prompts. Certbot will:
- Validate domain ownership
- Install SSL certificates to `/etc/letsencrypt/live/salary.ismgroups.lk/`
- Auto-renew (cron job added)

Verify SSL:
```bash
curl -I https://salary.ismgroups.lk
```

---

## 5. PM2 Setup for Server Process Management

### Step 1: Install PM2 globally (as root or with sudo)

```bash
sudo npm install -g pm2
```

### Step 2: Start the server with PM2 (first time, do manually)

```bash
cd /home/deploy/ism-server
pm2 start dist/server.js --name ism-server
pm2 save                 # Save process list
pm2 startup              # Setup auto-restart on reboot
```

### Step 3: View logs

```bash
pm2 logs ism-server
pm2 monit               # Real-time monitoring
```

### Step 4: Restart/stop commands

```bash
pm2 restart ism-server
pm2 stop ism-server
pm2 delete ism-server
```

GitHub Actions will automatically do `pm2 restart ism-server` or start it if not running.

---

## 6. Database Setup on VPS

### Step 1: Install MySQL (if not already installed)

```bash
sudo apt install -y mysql-server
sudo mysql_secure_installation
```

### Step 2: Create database and user

```bash
mysql -u root -p
```

Then run:
```sql
CREATE DATABASE ISM_salary;
CREATE USER 'mrfawz_user'@'localhost' IDENTIFIED BY 'YOUR_PROD_PASSWORD';
GRANT ALL PRIVILEGES ON ISM_salary.* TO 'mrfawz_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Step 3: Import schema (if you have a schema file)

```bash
mysql -u mrfawz_user -p ISM_salary < COMPLETE_SETUP.sql
```

---

## 7. SSH Key Setup (One-time)

### On your local machine:

**If you don't have a key pair:**
```bash
ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa_deploy -C "deploy@ismgroups"
# Leave passphrase empty for GitHub Actions
```

**Copy public key to VPS:**
```bash
ssh-copy-id -i ~/.ssh/id_rsa_deploy deploy@salary.ismgroups.lk
# or manually:
cat ~/.ssh/id_rsa_deploy.pub | ssh deploy@salary.ismgroups.lk "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

**Add private key to GitHub Secrets:**
```bash
cat ~/.ssh/id_rsa_deploy
# Copy entire output → GitHub → Settings → Secrets → SSH_PRIVATE_KEY
```

---

## 8. Deployment Workflow Summary

**On push to `main`:**

1. GitHub Actions checks out your repo
2. Client workflow (if `client/**` changed):
   - Installs dependencies
   - Builds with Vite
   - Syncs `client/dist/` to `/var/www/ism-client/` via rsync
   - Reloads Nginx

3. Server workflow (if `server/**` changed):
   - Installs dependencies
   - Builds TypeScript to `dist/`
   - Syncs `dist/` and `package.json` to `/home/deploy/ism-server/` via rsync
   - Runs `npm ci --production` on VPS
   - Restarts PM2 process

4. Nginx serves:
   - `/` → client static files
   - `/api/*` → proxies to backend on `localhost:5001`

---

## 9. Monitoring & Health Checks

### Check if services are running:

```bash
# Check Nginx
sudo systemctl status nginx

# Check PM2
pm2 status

# Check if backend is responding
curl -I https://salary.ismgroups.lk/api/health

# Check database connection
mysql -u mrfawz_user -p -e "SELECT VERSION();"
```

### View logs:

```bash
# Nginx error log
sudo tail -f /var/log/nginx/error.log

# Nginx access log
sudo tail -f /var/log/nginx/access.log

# PM2 server logs
pm2 logs ism-server

# System logs
sudo journalctl -xe
```

---

## 10. Troubleshooting

| Issue | Solution |
|-------|----------|
| DNS not resolving | Wait 30 min, check registrar settings, verify A record points to correct IP |
| SSL cert error | Run `sudo certbot renew --dry-run`, check `/var/log/letsencrypt/letsencrypt.log` |
| 502 Bad Gateway | Check `pm2 status`, verify backend running on `localhost:5001`, check PM2 logs |
| Permission denied on rsync | Verify deploy user owns `/var/www/ism-client` and `/home/deploy/ism-server` |
| GitHub Actions fails | Check Action logs in repo → Actions tab, verify secrets are set, check SSH key perms (600) |
| Client not loading | Check Nginx config, verify `client/dist/` files exist, check browser console |
| API calls fail | Verify `CLIENT_URL` in server `.env` matches domain, check CORS settings |

---

## 11. Backup & Maintenance

### Backup database regularly:

```bash
mysqldump -u mrfawz_user -p ISM_salary > ism_backup_$(date +%Y%m%d).sql
```

### Update system packages:

```bash
sudo apt update
sudo apt upgrade -y
```

### Renew SSL certificate (automatic with Certbot, but manual check):

```bash
sudo certbot renew --dry-run
```

---

## Next Steps

1. **Add GitHub Secrets** (SSH_PRIVATE_KEY, VPS_HOST, etc.)
2. **Add DNS A record** for `salary.ismgroups.lk`
3. **SSH into VPS**, run VPS setup commands (directories, Node, PM2, Nginx)
4. **Create `.env`** on VPS
5. **Setup SSL** with Certbot
6. **Push to `main`** and watch GitHub Actions deploy automatically

Questions? Check `/docs/GITHUB_ACTIONS_DEPLOY.md` for more workflow details.
