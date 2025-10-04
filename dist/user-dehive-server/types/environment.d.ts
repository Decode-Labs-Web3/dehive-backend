declare namespace NodeJS {
    interface ProcessEnv {
        REDIS_HOST: string;
        REDIS_PORT: string;
        KAFKA_BROKERS: string;
        KAFKA_CLIENT_ID: string;
        KAFKA_GROUP_ID: string;
        MONGODB_URI: string;
        PORT: string;
        NODE_ENV: 'development' | 'production' | 'test';
    }
}
