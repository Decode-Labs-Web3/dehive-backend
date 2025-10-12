module.exports = {
  apps: [
    {
      name: 'dehive-auth',
      script: 'dist/apps/auth/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        AUTH_PORT: 4006
      }
    },
    {
      name: 'dehive-user-server',
      script: 'dist/apps/user-dehive-server/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        USER_DEHIVE_SERVER_PORT: 4001
      }
    },
    {
      name: 'dehive-server',
      script: 'dist/apps/server/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        SERVER_PORT: 4002
      }
    },
    {
      name: 'dehive-channel-messaging',
      script: 'dist/apps/channel-messaging/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        CHANNEL_MESSAGING_PORT: 4003
      }
    },
    {
      name: 'dehive-direct-messaging',
      script: 'dist/apps/direct-messaging/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        DIRECT_MESSAGING_PORT: 4004
      }
    },
    {
      name: 'dehive-api-gateway',
      script: 'dist/apps/api-gateway/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};
