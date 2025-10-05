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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var GatewayController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GatewayController = void 0;
const common_1 = require("@nestjs/common");
const gateway_service_1 = require("./gateway.service");
let GatewayController = GatewayController_1 = class GatewayController {
    constructor(gatewayService) {
        this.gatewayService = gatewayService;
        this.logger = new common_1.Logger(GatewayController_1.name);
    }
    async getHealth(res) {
        try {
            const serviceStatus = this.gatewayService.getServiceStatus();
            const allServices = this.gatewayService.getAllServices();
            const healthStatus = {
                status: 'ok',
                timestamp: new Date().toISOString(),
                services: Object.keys(allServices).map(serviceName => ({
                    name: serviceName,
                    url: allServices[serviceName].url,
                    status: serviceStatus[serviceName] ? 'up' : 'down',
                    lastChecked: new Date().toISOString()
                }))
            };
            const allServicesUp = Object.values(serviceStatus).every(status => status === true);
            const httpStatus = allServicesUp ? common_1.HttpStatus.OK : common_1.HttpStatus.SERVICE_UNAVAILABLE;
            res.status(httpStatus).json(healthStatus);
        }
        catch (error) {
            this.logger.error('Health check failed:', error.message);
            res.status(common_1.HttpStatus.INTERNAL_SERVER_ERROR).json({
                status: 'error',
                message: 'Health check failed',
                timestamp: new Date().toISOString()
            });
        }
    }
    async getServices(res) {
        try {
            const services = this.gatewayService.getAllServices();
            const serviceStatus = this.gatewayService.getServiceStatus();
            const serviceInfo = Object.keys(services).map(serviceName => ({
                name: serviceName,
                url: services[serviceName].url,
                healthEndpoint: services[serviceName].healthEndpoint,
                timeout: services[serviceName].timeout,
                retries: services[serviceName].retries,
                status: serviceStatus[serviceName] ? 'up' : 'down'
            }));
            res.json({
                services: serviceInfo,
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            this.logger.error('Failed to get services info:', error.message);
            res.status(common_1.HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Failed to get services info',
                timestamp: new Date().toISOString()
            });
        }
    }
    async refreshServices(res) {
        try {
            await this.gatewayService.refreshServiceStatus();
            const serviceStatus = this.gatewayService.getServiceStatus();
            res.json({
                message: 'Service status refreshed',
                services: serviceStatus,
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            this.logger.error('Failed to refresh service status:', error.message);
            res.status(common_1.HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Failed to refresh service status',
                timestamp: new Date().toISOString()
            });
        }
    }
    async handleAllRequests(req, res) {
        const startTime = Date.now();
        const { method, url, headers, body, ip } = req;
        this.logger.log(`📥 ${method} ${url} from ${ip}`);
        try {
            const pathParts = url.split('/').filter(part => part);
            const serviceName = this.determineService(pathParts, method, url);
            if (!serviceName) {
                this.logger.warn(`❌ No service found for ${method} ${url}`);
                throw new common_1.HttpException('Service not found', common_1.HttpStatus.NOT_FOUND);
            }
            const servicePath = this.getServicePath(pathParts, serviceName);
            this.logger.log(`🔄 Routing ${method} ${url} → ${serviceName}${servicePath}`);
            const result = await this.gatewayService.proxyRequest(serviceName, servicePath, method, body, headers);
            const duration = Date.now() - startTime;
            this.logger.log(`✅ ${method} ${url} → ${serviceName} (${result.statusCode}) - ${duration}ms`);
            if (result.headers) {
                Object.keys(result.headers).forEach(key => {
                    if (key.toLowerCase() !== 'content-length') {
                        res.setHeader(key, result.headers[key]);
                    }
                });
            }
            res.status(result.statusCode).json(result.data);
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.logger.error(`❌ Gateway error for ${method} ${url} (${duration}ms):`, error.message);
            if (error instanceof common_1.HttpException) {
                res.status(error.getStatus()).json({
                    message: error.message,
                    statusCode: error.getStatus(),
                    timestamp: new Date().toISOString(),
                    path: url,
                });
            }
            else {
                res.status(common_1.HttpStatus.INTERNAL_SERVER_ERROR).json({
                    message: 'Internal server error',
                    statusCode: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
                    timestamp: new Date().toISOString(),
                    path: url,
                });
            }
        }
    }
    determineService(pathParts, method, url) {
        this.logger.debug(`🔍 Determining service for URL: ${url}`);
        this.logger.debug(`🔍 Path parts: ${JSON.stringify(pathParts)}`);
        const routingRules = [
            {
                service: 'auth',
                patterns: ['auth', 'login', 'register', 'logout', 'refresh'],
                description: 'Authentication service'
            },
            {
                service: 'user-dehive-server',
                patterns: ['memberships', 'profiles', 'invites', 'users'],
                description: 'User management service'
            },
            {
                service: 'server',
                patterns: ['servers', 'categories'],
                description: 'Server management service'
            },
            {
                service: 'channel-messaging',
                patterns: ['channels', 'messages', 'uploads'],
                description: 'Channel messaging service'
            },
            {
                service: 'direct-messaging',
                patterns: ['direct', 'conversations', 'dm'],
                description: 'Direct messaging service'
            }
        ];
        for (const rule of routingRules) {
            for (const pattern of rule.patterns) {
                if (pathParts[0] === pattern || url.includes(`/${pattern}/`)) {
                    this.logger.debug(`🔍 Routing to ${rule.service} (${rule.description})`);
                    return rule.service;
                }
            }
        }
        this.logger.warn(`❌ No service found for URL: ${url}`);
        return null;
    }
    getServicePath(pathParts, serviceName) {
        let servicePath = '/' + pathParts.join('/');
        this.logger.debug(`🔍 Original path: ${servicePath}`);
        this.logger.debug(`🔍 Service: ${serviceName}`);
        const pathTransformations = {
            'auth': {
                transform: (path) => path
            },
            'server': {
                transform: (path) => {
                    if (path.startsWith('/servers')) {
                        return path.replace('/servers', '/api/servers');
                    }
                    else if (path.startsWith('/categories')) {
                        return path.replace('/categories', '/api/categories');
                    }
                    return path;
                }
            },
            'user-dehive-server': {
                transform: (path) => {
                    if (path.startsWith('/memberships')) {
                        return path.replace('/memberships', '/api/memberships');
                    }
                    else if (path.startsWith('/profiles')) {
                        return path.replace('/profiles', '/api/memberships/profile');
                    }
                    else if (path.startsWith('/invites')) {
                        return path.replace('/invites', '/api/memberships/invite');
                    }
                    else if (path.startsWith('/users')) {
                        return path.replace('/users', '/api/users');
                    }
                    return path;
                }
            },
            'channel-messaging': {
                transform: (path) => {
                    if (path.startsWith('/channels')) {
                        return path.replace('/channels', '/api/channels');
                    }
                    else if (path.startsWith('/messages')) {
                        return path.replace('/messages', '/api/messages');
                    }
                    else if (path.startsWith('/uploads')) {
                        return path.replace('/uploads', '/api/uploads');
                    }
                    return path;
                }
            },
            'direct-messaging': {
                transform: (path) => {
                    if (path.startsWith('/direct')) {
                        return path.replace('/direct', '/api/direct');
                    }
                    else if (path.startsWith('/conversations')) {
                        return path.replace('/conversations', '/api/conversations');
                    }
                    else if (path.startsWith('/dm')) {
                        return path.replace('/dm', '/api/dm');
                    }
                    return path;
                }
            }
        };
        const transformation = pathTransformations[serviceName];
        if (transformation) {
            servicePath = transformation.transform(servicePath);
        }
        this.logger.debug(`🔍 Final service path: ${servicePath}`);
        return servicePath;
    }
};
exports.GatewayController = GatewayController;
__decorate([
    (0, common_1.Get)('health'),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GatewayController.prototype, "getHealth", null);
__decorate([
    (0, common_1.Get)('services'),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GatewayController.prototype, "getServices", null);
__decorate([
    (0, common_1.Get)('refresh'),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GatewayController.prototype, "refreshServices", null);
__decorate([
    (0, common_1.All)('*'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GatewayController.prototype, "handleAllRequests", null);
exports.GatewayController = GatewayController = GatewayController_1 = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [gateway_service_1.GatewayService])
], GatewayController);
//# sourceMappingURL=gateway.controller.js.map