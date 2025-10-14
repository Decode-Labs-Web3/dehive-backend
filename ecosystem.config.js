module.exports = {
  apps: [
    {
      name: 'auth',
      script: 'dist/apps/auth/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 4006
      }
    },
    {
      name: 'user-dehive-server',
      script: 'dist/apps/user-dehive-server/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 4001
      }
    },
    {
      name: 'server',
      script: 'dist/apps/server/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 4002
      }
    },
    {
      name: 'channel-messaging',
      script: 'dist/apps/channel-messaging/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 4003
      }
    },
    {
      name: 'direct-messaging',
      script: 'dist/apps/direct-messaging/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 4004
      }
    }
  ]
};
