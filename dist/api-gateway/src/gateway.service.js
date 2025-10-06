"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var GatewayService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GatewayService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
let GatewayService = GatewayService_1 = class GatewayService {
    httpService;
    logger = new common_1.Logger(GatewayService_1.name);
    services = {
        auth: {
            url: 'http://localhost:4006',
            healthEndpoint: '/auth/health',
            timeout: 5000,
            retries: 3
        },
        server: {
            url: 'http://localhost:4002',
            healthEndpoint: '/api/servers/health',
            timeout: 5000,
            retries: 3
        },
        'user-dehive-server': {
            url: 'http://localhost:4001',
            healthEndpoint: '/api/health',
            timeout: 5000,
            retries: 3
        },
        'channel-messaging': {
            url: 'http://localhost:4003',
            healthEndpoint: '/api/health',
            timeout: 5000,
            retries: 3
        },
        'direct-messaging': {
            url: 'http://localhost:4004',
            healthEndpoint: '/api/health',
            timeout: 5000,
            retries: 3
        },
    };
    serviceStatus = {};
    lastHealthCheck = {};
    healthCheckInterval = 30000;
    constructor(httpService) {
        this.httpService = httpService;
    }
    async proxyRequest(serviceName, path, method, body, headers) {
        const serviceConfig = this.services[serviceName];
        if (!serviceConfig) {
            throw new common_1.HttpException(`Service ${serviceName} not found`, common_1.HttpStatus.NOT_FOUND);
        }
        const isServiceAvailable = await this.checkServiceHealth(serviceName);
        if (!isServiceAvailable) {
            throw new common_1.HttpException(`Service ${serviceName} is unavailable`, common_1.HttpStatus.SERVICE_UNAVAILABLE);
        }
        const fullUrl = `${serviceConfig.url}${path}`;
        this.logger.log(`🔄 Proxying ${method} ${fullUrl}`);
        this.logger.debug(`Headers: ${JSON.stringify(headers)}`);
        this.logger.debug(`Body: ${JSON.stringify(body)}`);
        const cleanHeaders = this.cleanHeaders(headers);
        let lastError;
        for (let attempt = 1; attempt <= serviceConfig.retries; attempt++) {
            try {
                let response;
                switch (method.toUpperCase()) {
                    case 'GET':
                        response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(fullUrl, {
                            headers: cleanHeaders,
                            timeout: serviceConfig.timeout
                        }));
                        break;
                    case 'POST':
                        response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(fullUrl, body, {
                            headers: cleanHeaders,
                            timeout: serviceConfig.timeout
                        }));
                        break;
                    case 'PUT':
                        response = await (0, rxjs_1.firstValueFrom)(this.httpService.put(fullUrl, body, {
                            headers: cleanHeaders,
                            timeout: serviceConfig.timeout
                        }));
                        break;
                    case 'PATCH':
                        response = await (0, rxjs_1.firstValueFrom)(this.httpService.patch(fullUrl, body, {
                            headers: cleanHeaders,
                            timeout: serviceConfig.timeout
                        }));
                        break;
                    case 'DELETE':
                        response = await (0, rxjs_1.firstValueFrom)(this.httpService.delete(fullUrl, {
                            headers: cleanHeaders,
                            timeout: serviceConfig.timeout
                        }));
                        break;
                    default:
                        throw new common_1.HttpException(`Method ${method} not supported`, common_1.HttpStatus.METHOD_NOT_ALLOWED);
                }
                this.logger.log(`✅ Success response from ${serviceName}: ${response.status}`);
                return {
                    data: response.data,
                    statusCode: response.status,
                    headers: response.headers
                };
            }
            catch (error) {
                lastError = error;
                if (error.response) {
                    this.logger.log(`✅ Forwarding response from ${serviceName}: ${error.response.status}`);
                    return {
                        data: error.response.data,
                        statusCode: error.response.status,
                        headers: error.response.headers
                    };
                }
                if (attempt < serviceConfig.retries) {
                    const delay = Math.pow(2, attempt) * 1000;
                    this.logger.warn(`⚠️ Attempt ${attempt} failed for ${serviceName}, retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }
            }
        }
        this.logger.error(`❌ Service ${serviceName} failed after ${serviceConfig.retries} attempts:`, lastError.message);
        this.serviceStatus[serviceName] = false;
        throw new common_1.HttpException(`Service ${serviceName} is unavailable`, common_1.HttpStatus.SERVICE_UNAVAILABLE);
    }
    async checkServiceHealth(serviceName) {
        const serviceConfig = this.services[serviceName];
        if (!serviceConfig) {
            return false;
        }
        const now = Date.now();
        const lastCheck = this.lastHealthCheck[serviceName] || 0;
        if (this.serviceStatus[serviceName] === true && (now - lastCheck) < this.healthCheckInterval) {
            this.logger.debug(`Service ${serviceName} is cached as healthy`);
            return true;
        }
        if (this.serviceStatus[serviceName] === false && (now - lastCheck) < this.healthCheckInterval) {
            this.logger.debug(`Service ${serviceName} is cached as down`);
            return false;
        }
        try {
            const healthUrl = `${serviceConfig.url}${serviceConfig.healthEndpoint}`;
            this.logger.debug(`Checking health for ${serviceName} at ${healthUrl}`);
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(healthUrl, {
                timeout: serviceConfig.timeout
            }));
            this.serviceStatus[serviceName] = true;
            this.lastHealthCheck[serviceName] = now;
            this.logger.debug(`✅ Service ${serviceName} is healthy`);
            return true;
        }
        catch (error) {
            if (error.response && (error.response.status === 401 || error.response.status === 404)) {
                this.serviceStatus[serviceName] = true;
                this.lastHealthCheck[serviceName] = now;
                this.logger.debug(`✅ Service ${serviceName} is up (got ${error.response.status})`);
                return true;
            }
            this.logger.warn(`⚠️ Service ${serviceName} health check failed: ${error.message}`);
            this.serviceStatus[serviceName] = false;
            this.lastHealthCheck[serviceName] = now;
            return false;
        }
    }
    getServiceUrl(serviceName) {
        return this.services[serviceName]?.url;
    }
    getAllServices() {
        return this.services;
    }
    getServiceStatus() {
        return this.serviceStatus;
    }
    async refreshServiceStatus() {
        this.logger.log('🔄 Refreshing service status...');
        const healthChecks = Object.keys(this.services).map(async (serviceName) => {
            const isHealthy = await this.checkServiceHealth(serviceName);
            this.logger.log(`${isHealthy ? '✅' : '❌'} ${serviceName}: ${isHealthy ? 'UP' : 'DOWN'}`);
        });
        await Promise.all(healthChecks);
    }
    cleanHeaders(headers) {
        if (!headers)
            return {};
        const cleanHeaders = { ...headers };
        const headersToRemove = [
            'host',
            'x-forwarded-for',
            'x-forwarded-proto',
            'x-forwarded-host',
            'x-real-ip',
            'connection',
            'upgrade',
            'proxy-connection',
            'proxy-authenticate',
            'proxy-authorization',
            'te',
            'trailers',
            'transfer-encoding'
        ];
        headersToRemove.forEach(header => {
            delete cleanHeaders[header];
            delete cleanHeaders[header.toLowerCase()];
        });
        return cleanHeaders;
    }
};
exports.GatewayService = GatewayService;
exports.GatewayService = GatewayService = GatewayService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService])
], GatewayService);
//# sourceMappingURL=gateway.service.js.map