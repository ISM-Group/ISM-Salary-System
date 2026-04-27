# GitHub Actions: Deploy to VPS

This document describes the GitHub Actions workflows added to this repository and lists the secrets and VPS setup steps required to deploy the `client` and `server` to a VPS.

## 📋 Quick Links

- **New to deployment?** Start here: [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) (step-by-step checklist)
- **Setup GitHub secrets?** Read: [GITHUB_ACTIONS_SECRETS.md](GITHUB_ACTIONS_SECRETS.md)
- **Need complete reference?** See: [VPS_DEPLOYMENT_COMPLETE_GUIDE.md](VPS_DEPLOYMENT_COMPLETE_GUIDE.md)

---

Workflows added
- `.github/workflows/client-deploy.yml` — builds the client (Vite) and syncs `client/dist/` to `/var/www/ism-client` on VPS using `rsync` over SSH.
- `.github/workflows/server-deploy.yml` — builds the server (TypeScript -> `dist/`), syncs to `/home/deploy/ism-server` on VPS, runs `npm ci --production` and restarts PM2 process `ism-server`.
- `.github/workflows/lint-workflows.yml` — lints workflow YAML files with `actionlint`.

Required GitHub Repository Secrets (Only 3!)

- `SSH_PRIVATE_KEY` — private SSH key for the deploy user (PEM format). Keep this private.
- `VPS_HOST` — server host or IP address (e.g. `203.0.113.12` or `salary.ismgroup.lk`).
- `VPS_USER` — SSH user on VPS (e.g. `deploy`).

**Hardcoded in Workflows (No Secrets Needed):**

- Client deploy path: `/var/www/ism-client` → in `.github/workflows/client-deploy.yml`
- Server deploy path: `/home/deploy/ism-server` → in `.github/workflows/server-deploy.yml`
- PM2 process name: `ism-server` → in `.github/workflows/server-deploy.yml`

To customize these paths, edit the `.github/workflows/*.yml` files directly.

What's Changed in the Workflows

- Both workflows now set `permissions: contents: read` to follow least-privilege recommendations.
- `actions/setup-node@v4` is used with `cache: 'npm'` to cache dependencies and speed runs.
- SSH authentication is handled with `webfactory/ssh-agent@v0.7.0` (the private key stays in GitHub Secrets and is not written to a file).
- `rsync` is used to transfer build artifacts; remote host keys are added via `ssh-keyscan`.
- Deployment paths and PM2 process name are **hardcoded in workflow files** (no secrets needed).

Optional / Notes

- The client workflow attempts to reload `nginx` after deployment using `sudo systemctl reload nginx || true`. Either grant the deploy user passwordless sudo for `systemctl` or omit/adjust that step.
- The server workflow uses `pm2`. Ensure `pm2` is installed on the VPS (global) and the deploy user can run it.
- **Environment variables (`.env`) are stored on the VPS**, NOT in the repo. Place production env file at `/home/deploy/ism-server/.env` and ensure PM2 process reads it.

Quick VPS setup checklist (example commands for Ubuntu)

1. Create deploy user and add public key (run as root):

```
adduser deploy
usermod -aG sudo deploy
mkdir -p /home/deploy/.ssh
echo "ssh-rsa AAAA...REPLACE_WITH_YOUR_PUBLIC_KEY" >> /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
```

2. Create deploy directories and set permissions:

```
sudo mkdir -p /var/www/ism-client
sudo chown -R deploy:deploy /var/www/ism-client
sudo mkdir -p /home/deploy/ism-server
sudo chown -R deploy:deploy /home/deploy/ism-server
```

3. Install Node.js and pm2 (as the deploy user or root):

```
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs build-essential
sudo npm install -g pm2
```

4. (Optional) Configure Nginx to serve the client files from `CLIENT_DEPLOY_PATH`. Example site config snippet:

```
server {
    listen 80;
    server_name example.com;
    root /var/www/ism-client;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

5. Place your production environment variables for the server on the VPS (e.g. `/home/deploy/ism-server/.env`) and ensure the `pm2` process loads the file.

Adding secrets to GitHub

- Go to Repository -> Settings -> Secrets and variables -> Actions -> New repository secret.
- Add the required secrets listed earlier (paste the private key into `SSH_PRIVATE_KEY`).

How to trigger

- The workflows run automatically on pushes to `main` that change `client/**` or `server/**` respectively.
- You can also run them manually from the Actions tab using `workflow_dispatch`.

If you want, I can:

- update the workflows to use `webfactory/ssh-agent` instead of writing the key file to `~/.ssh`. ✅ **Done**
- add a `lint-workflows` job that runs `actionlint` on workflow YAML files. ✅ **Done**
- make the deploy commands idempotent (create a release folder, keep last N releases, symlink `current`).
- adapt the server restart step to use `systemd` instead of `pm2`.

## Next Steps (Choose One)

### First Time Deploying?
1. Read [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) — 10 phases with exact commands
2. Follow steps in order (DNS → VPS setup → Nginx → Secrets → Deploy)
3. Reference this doc or [VPS_DEPLOYMENT_COMPLETE_GUIDE.md](VPS_DEPLOYMENT_COMPLETE_GUIDE.md) for detailed info

### Already Have VPS Ready?
1. Add secrets from [GITHUB_ACTIONS_SECRETS.md](GITHUB_ACTIONS_SECRETS.md)
2. SSH into VPS and run VPS setup phase from [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)
3. Push to `main` and watch Actions tab
4. Troubleshoot using [VPS_DEPLOYMENT_COMPLETE_GUIDE.md](VPS_DEPLOYMENT_COMPLETE_GUIDE.md)

### Need Complete Reference?
- Read [VPS_DEPLOYMENT_COMPLETE_GUIDE.md](VPS_DEPLOYMENT_COMPLETE_GUIDE.md) for all details
- Covers: DNS, Nginx config, SSL setup, PM2, MySQL, SSH, monitoring, backups, troubleshooting
