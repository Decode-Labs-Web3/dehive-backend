export default () => ({
  apiGateway: {
    port: parseInt(process.env.API_GATEWAY_PORT || '4000', 10),
    host: process.env.API_GATEWAY_HOST
      ? process.env.API_GATEWAY_HOST.replace('http://', '').replace(
          'https://',
          '',
        )
      : '0.0.0.0',
  },
  environment: process.env.NODE_ENV || 'development',
  // Database connections
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/dehive-auth',
  REDIS_URI: process.env.REDIS_URI || 'redis://localhost:6379',
  // Service URLs
  services: {
    decode_api_gateway: {
      url:
        process.env.DECODE_API_GATEWAY_HOST &&
        process.env.DECODE_API_GATEWAY_PORT
          ? `http://${process.env.DECODE_API_GATEWAY_HOST}:${process.env.DECODE_API_GATEWAY_PORT}`
          : 'http://localhost:4000',
    },
    decode_auth: {
      url:
        process.env.DECODE_AUTH_HOST && process.env.DECODE_AUTH_PORT
          ? `http://${process.env.DECODE_AUTH_HOST}:${process.env.DECODE_AUTH_PORT}`
          : 'http://localhost:4001',
    },
  },
});
