module.exports = {
  apps: [
    {
      name: 'thumbnail-tool',
      script: './start.sh',
      cwd: '/opt/thumbnail-generator',
      env: {
        NODE_ENV: 'production',
        PORT: 3072,
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      time: true,
    },
    {
      name: 'thumbnail-worker',
      script: 'npm',
      args: 'run worker',
      cwd: '/opt/thumbnail-generator',
      env: {
        NODE_ENV: 'production',
        WORKER_CONCURRENCY: 2, // Process 2 jobs concurrently
      },
      env_file: '.env',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: './logs/worker-error.log',
      out_file: './logs/worker-out.log',
      time: true,
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 5000,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },
  ],
};
