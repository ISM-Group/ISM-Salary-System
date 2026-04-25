/**
 * PM2: ISM Salary System — API + static client
 *
 * Processes:
 *   - ism-server   → Express API (Node)
 *   - ism-client   → Vite build in /var/www/ism-client, served by the `serve` CLI (Node)
 *
 * Prerequisite on the VPS (once):
 *   npm i -g serve
 *   (must be on PATH for the user that runs PM2)
 *
 * Start / reload both:
 *   pm2 start ecosystem.config.js
 *   pm2 reload ecosystem.config.js --update-env
 *
 * Nginx: do not use `root /var/www/ism-client` if this process is active — proxy to Node instead:
 *
 *   location / {
 *     proxy_pass http://127.0.0.1:4173;
 *     proxy_http_version 1.1;
 *     proxy_set_header Host $host;
 *     proxy_set_header X-Real-IP $remote_addr;
 *     proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
 *     proxy_set_header X-Forwarded-Proto $scheme;
 *   }
 *
 * TRADE-OFFS (vs Nginx serving files directly)
 *   - Extra RAM/CPU for a Node process (~tens of MB; `serve` is small).
 *   - One more moving part to restart/monitor (mitigated by PM2).
 *   - Slightly more latency than raw `sendfile` (usually negligible for SPAs).
 *   - Gains: one mental model (both app tiers in `pm2 list`), unified logs/restarts.
 */

module.exports = {
  apps: [
    {
      name: 'ism-server',
      script: './dist/server.js',
      cwd: '/home/deploy/ism-server',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 5002,
      },
      error_file: '/home/deploy/ism-server/logs/error.log',
      out_file: '/home/deploy/ism-server/logs/out.log',
      log_file: '/home/deploy/ism-server/logs/combined.log',
      time: true,
      max_memory_restart: '500M',
      autorestart: true,
      watch: false,
      ignore_watch: ['node_modules', 'logs'],
      max_restarts: 10,
      min_uptime: '10s',
    },
    {
      name: 'ism-client',
      script: 'serve',
      // -s: SPA fallthrough to index.html; bind localhost only (Nginx on same host reverse-proxies)
      args: ['-s', '-l', 'tcp://127.0.0.1:4173', '/var/www/ism-client'],
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      time: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      max_restarts: 10,
      min_uptime: '5s',
    },
  ],
};
