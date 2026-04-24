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
      cwd: '/var/www/ism-client',
      script: 'none',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      ignore_watch: ['node_modules', '.next'],
    },
  ],
};
