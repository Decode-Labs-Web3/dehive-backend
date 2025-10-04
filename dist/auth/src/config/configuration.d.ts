declare const _default: () => {
    apiGateway: {
        port: number;
        host: string;
    };
    environment: "development" | "production" | "test";
    MONGO_URI: string;
    REDIS_URI: string;
    services: {
        decode_api_gateway: {
            url: string;
        };
        decode_auth: {
            url: string;
        };
    };
};
export default _default;
