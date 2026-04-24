# GitHub Actions Secrets Setup

This file helps you set up all required secrets for GitHub Actions to deploy to your VPS.

## Where to Add Secrets

1. Go to your GitHub repository
2. **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret below (copy exact name and value format)

---

## Required Secrets (Only 3!)

Deployment paths and PM2 process name are now **hardcoded in the workflows**, so you only need these 3 secrets:

### 1. `SSH_PRIVATE_KEY`

**Description:** Private SSH key for the deploy user on VPS (PEM format)

**Where to get:**
- If you already have a key: `cat ~/.ssh/id_rsa_deploy` (copy entire output)
- If you need a new key (run on your local machine):

```bash
ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa_deploy -C "deploy@ismgroups"
# Leave passphrase empty
# Copy the private key:
cat ~/.ssh/id_rsa_deploy
```

**Value format:** Entire multi-line PEM key:
```
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA7s4k...
[many lines]
-----END RSA PRIVATE KEY-----
```

**How to add:** Paste entire output into the value field

---

### 2. `VPS_HOST`

**Description:** IP address or hostname of your VPS

**Value examples:**
- IP address: `203.0.113.42`
- Or hostname (after DNS setup): `salary.ismgroups.lk`

**Where to get:** From your VPS provider dashboard or:
```bash
curl -s http://ifconfig.me
```

---

### 3. `VPS_USER`

**Description:** SSH username on your VPS

**Recommended value:** `deploy`

**Note:** You should have created this user on VPS with SSH key access

---

## Hardcoded in Workflows (No Secrets Needed)

These are now defined directly in the workflow files:

| Value | Location in Workflow |
|-------|---------------------|
| Client deploy path | `/var/www/ism-client` | (hardcoded in `client-deploy.yml`) |
| Server deploy path | `/home/deploy/ism-server` | (hardcoded in `server-deploy.yml`) |
| PM2 process name | `ism-server` | (hardcoded in `server-deploy.yml`) |

To customize these, edit the `.github/workflows/*.yml` files directly.

---

## Optional Secrets (for future use)

### `SLACK_WEBHOOK` (future notifications)
```
https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### `SENTRY_DSN` (future error tracking)
```
https://xxxxx@sentry.io/123456
```

---

## Quick Setup Command

Once you have all 3 values ready, you can add them via GitHub CLI (if installed):

```bash
# Install GitHub CLI: brew install gh (macOS) or apt install gh (Linux)

gh auth login
# Follow prompts to authenticate

# Add secrets (only 3!)
gh secret set SSH_PRIVATE_KEY < ~/.ssh/id_rsa_deploy
gh secret set VPS_HOST --body "203.0.113.42"
gh secret set VPS_USER --body "deploy"

# Verify
gh secret list
```

Or manually via GitHub UI:

1. Go to **Settings → Secrets and variables → Actions**
2. Click **New repository secret** for each:

| Name | Value |
|------|-------|
| SSH_PRIVATE_KEY | [paste entire private key] |
| VPS_HOST | 203.0.113.42 |
| VPS_USER | deploy |

---

## Environment Variables on VPS

**Note:** `.env` files are **stored on the VPS** (NOT in GitHub), at:
- Server: `/home/deploy/ism-server/.env`

This is the secure practice. The workflow never touches or deploys `.env` files. You manage them directly on the VPS.

## Testing Secrets

After adding secrets, verify by:

1. Go to **Actions** tab
2. Click **Deploy client to VPS** or **Deploy server to VPS**
3. Click **Run workflow**
4. Watch the logs

If you see errors like "permission denied" or "host key verification failed", check:
- SSH key is correct (no extra whitespace)
- VPS_HOST is reachable
- VPS_USER has SSH access with the public key

---

## Updating Secrets

If you need to change a secret:

1. Go to **Settings → Secrets and variables → Actions**
2. Find the secret
3. Click the pencil icon to edit
4. Update value
5. Save

---

## Revoking/Rotating SSH Key

If you suspect the SSH key is compromised:

1. On VPS, remove the public key from `~/.ssh/authorized_keys`
2. Generate a new key pair
3. Add new public key to VPS
4. Update `SSH_PRIVATE_KEY` secret on GitHub
5. Delete the old private key locally

```bash
# Revoke old key on VPS
nano ~/.ssh/authorized_keys
# Remove the old key line

# Add new key
cat ~/.ssh/id_rsa_deploy.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

---

## References

- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [webfactory/ssh-agent](https://github.com/webfactory/ssh-agent) - The action we use for SSH
- [GitHub CLI Secret Command](https://cli.github.com/manual/gh_secret_set)
