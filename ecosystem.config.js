module.exports = {
  apps: [
    {
      name: 'auth',
      script: 'dist/apps/auth/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 4006,
        AUTH_PORT: 4006,
        CLOUD_HOST: '0.0.0.0'
      }
    },
    {
      name: 'user-dehive-server',
      script: 'dist/apps/user-dehive-server/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 4001,
        USER_DEHIVE_SERVER_PORT: 4001,
        CLOUD_HOST: '0.0.0.0'
      }
    },
    {
      name: 'server',
      script: 'dist/apps/server/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 4002,
        SERVER_PORT: 4002,
        CLOUD_HOST: '0.0.0.0'
      }
    },
    {
      name: 'channel-messaging',
      script: 'dist/apps/channel-messaging/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 4003,
        CHANNEL_MESSAGING_PORT: 4003,
        CLOUD_HOST: '0.0.0.0'
      }
    },
    {
      name: 'direct-messaging',
      script: 'dist/apps/direct-messaging/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 4004,
        DIRECT_MESSAGING_PORT: 4004,
        CLOUD_HOST: '0.0.0.0'
      }
    },
    {
      name: 'direct-calling',
      script: 'dist/apps/direct-calling/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 4005,
        DIRECT_CALLING_PORT: 4005,
        CLOUD_HOST: '0.0.0.0'
      }
    },
    {
      name: 'channel-calling',
      script: 'dist/apps/channel-calling/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 4007,
        CHANNEL_CALLING_PORT: 4007,
        CLOUD_HOST: '0.0.0.0'
      }
    },
    {
      name: 'user-status',
      script: 'dist/apps/user-status/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 4008,
        USER_STATUS_PORT: 4008,
        CLOUD_HOST: '0.0.0.0'
      }
    }
  ]
};
