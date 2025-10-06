import { HttpService } from '@nestjs/axios';
interface ServiceConfig {
    url: string;
    healthEndpoint: string;
    timeout: number;
    retries: number;
}
export declare class GatewayService {
    private readonly httpService;
    private readonly logger;
    private readonly services;
    private serviceStatus;
    private lastHealthCheck;
    private readonly healthCheckInterval;
    constructor(httpService: HttpService);
    proxyRequest(serviceName: string, path: string, method: string, body?: any, headers?: any): Promise<{
        data: any;
        statusCode: any;
        headers: any;
    }>;
    private checkServiceHealth;
    getServiceUrl(serviceName: string): string;
    getAllServices(): Record<string, ServiceConfig>;
    getServiceStatus(): Record<string, boolean>;
    refreshServiceStatus(): Promise<void>;
    private cleanHeaders;
}
export {};
