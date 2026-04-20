module.exports = {
  apps: [
    {
      name: 'thumbnail-tool',
      script: 'npm',
      args: 'start',
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
  ],
};
