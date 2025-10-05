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
var GatewaySimpleController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GatewaySimpleController = void 0;
const common_1 = require("@nestjs/common");
const gateway_service_1 = require("./gateway.service");
let GatewaySimpleController = GatewaySimpleController_1 = class GatewaySimpleController {
    constructor(gatewayService) {
        this.gatewayService = gatewayService;
        this.logger = new common_1.Logger(GatewaySimpleController_1.name);
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
    async handleAuthGet(req, res) {
        return this.proxyRequest('auth', req, res);
    }
    async handleAuthPost(req, res) {
        return this.proxyRequest('auth', req, res);
    }
    async handleAuthPut(req, res) {
        return this.proxyRequest('auth', req, res);
    }
    async handleAuthPatch(req, res) {
        return this.proxyRequest('auth', req, res);
    }
    async handleAuthDelete(req, res) {
        return this.proxyRequest('auth', req, res);
    }
    async handleServerGet(req, res) {
        return this.proxyRequest('server', req, res);
    }
    async handleServerPost(req, res) {
        return this.proxyRequest('server', req, res);
    }
    async handleServerPut(req, res) {
        return this.proxyRequest('server', req, res);
    }
    async handleServerPatch(req, res) {
        return this.proxyRequest('server', req, res);
    }
    async handleServerDelete(req, res) {
        return this.proxyRequest('server', req, res);
    }
    async handleMembershipGet(req, res) {
        return this.proxyRequest('user-dehive-server', req, res);
    }
    async handleMembershipPost(req, res) {
        return this.proxyRequest('user-dehive-server', req, res);
    }
    async handleMembershipPut(req, res) {
        return this.proxyRequest('user-dehive-server', req, res);
    }
    async handleMembershipPatch(req, res) {
        return this.proxyRequest('user-dehive-server', req, res);
    }
    async handleMembershipDelete(req, res) {
        return this.proxyRequest('user-dehive-server', req, res);
    }
    async handleProfileGet(req, res) {
        return this.proxyRequest('user-dehive-server', req, res);
    }
    async handleProfilePost(req, res) {
        return this.proxyRequest('user-dehive-server', req, res);
    }
    async handleProfilePut(req, res) {
        return this.proxyRequest('user-dehive-server', req, res);
    }
    async handleProfilePatch(req, res) {
        return this.proxyRequest('user-dehive-server', req, res);
    }
    async handleProfileDelete(req, res) {
        return this.proxyRequest('user-dehive-server', req, res);
    }
    async handleChannelGet(req, res) {
        return this.proxyRequest('channel-messaging', req, res);
    }
    async handleChannelPost(req, res) {
        return this.proxyRequest('channel-messaging', req, res);
    }
    async handleChannelPut(req, res) {
        return this.proxyRequest('channel-messaging', req, res);
    }
    async handleChannelPatch(req, res) {
        return this.proxyRequest('channel-messaging', req, res);
    }
    async handleChannelDelete(req, res) {
        return this.proxyRequest('channel-messaging', req, res);
    }
    async handleMessageGet(req, res) {
        return this.proxyRequest('channel-messaging', req, res);
    }
    async handleMessagePost(req, res) {
        return this.proxyRequest('channel-messaging', req, res);
    }
    async handleMessagePut(req, res) {
        return this.proxyRequest('channel-messaging', req, res);
    }
    async handleMessagePatch(req, res) {
        return this.proxyRequest('channel-messaging', req, res);
    }
    async handleMessageDelete(req, res) {
        return this.proxyRequest('channel-messaging', req, res);
    }
    async handleDirectGet(req, res) {
        return this.proxyRequest('direct-messaging', req, res);
    }
    async handleDirectPost(req, res) {
        return this.proxyRequest('direct-messaging', req, res);
    }
    async handleDirectPut(req, res) {
        return this.proxyRequest('direct-messaging', req, res);
    }
    async handleDirectPatch(req, res) {
        return this.proxyRequest('direct-messaging', req, res);
    }
    async handleDirectDelete(req, res) {
        return this.proxyRequest('direct-messaging', req, res);
    }
    async handleConversationGet(req, res) {
        return this.proxyRequest('direct-messaging', req, res);
    }
    async handleConversationPost(req, res) {
        return this.proxyRequest('direct-messaging', req, res);
    }
    async handleConversationPut(req, res) {
        return this.proxyRequest('direct-messaging', req, res);
    }
    async handleConversationPatch(req, res) {
        return this.proxyRequest('direct-messaging', req, res);
    }
    async handleConversationDelete(req, res) {
        return this.proxyRequest('direct-messaging', req, res);
    }
    async proxyRequest(serviceName, req, res) {
        const startTime = Date.now();
        const { method, url, headers, body, ip } = req;
        this.logger.log(`📥 ${method} ${url} from ${ip}`);
        try {
            const servicePath = this.getServicePath(url, serviceName);
            this.logger.log(`🔄 Routing ${method} ${url} → ${serviceName}${servicePath}`);
            const result = await this.gatewayService.proxyRequest(serviceName, servicePath, method, body, headers);
            const duration = Date.now() - startTime;
            this.logger.log(`✅ ${method} ${url} → ${serviceName} (${result.statusCode}) - ${duration}ms`);
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
    getServicePath(url, serviceName) {
        let servicePath = url;
        switch (serviceName) {
            case 'auth':
                break;
            case 'server':
                servicePath = servicePath.replace('/servers', '/api/servers');
                break;
            case 'user-dehive-server':
                if (servicePath.startsWith('/memberships')) {
                    servicePath = servicePath.replace('/memberships', '/api/memberships');
                }
                else if (servicePath.startsWith('/profiles')) {
                    servicePath = servicePath.replace('/profiles', '/api/memberships/profile');
                }
                break;
            case 'channel-messaging':
                if (servicePath.startsWith('/channels')) {
                    servicePath = servicePath.replace('/channels', '/api/channels');
                }
                else if (servicePath.startsWith('/messages')) {
                    servicePath = servicePath.replace('/messages', '/api/messages');
                }
                break;
            case 'direct-messaging':
                if (servicePath.startsWith('/direct')) {
                    servicePath = servicePath.replace('/direct', '/api/direct');
                }
                else if (servicePath.startsWith('/conversations')) {
                    servicePath = servicePath.replace('/conversations', '/api/conversations');
                }
                break;
        }
        this.logger.debug(`🔍 Final service path: ${servicePath}`);
        return servicePath;
    }
};
exports.GatewaySimpleController = GatewaySimpleController;
__decorate([
    (0, common_1.Get)('health'),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GatewaySimpleController.prototype, "getHealth", null);
__decorate([
    (0, common_1.Get)('services'),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GatewaySimpleController.prototype, "getServices", null);
__decorate([
    (0, common_1.Get)('refresh'),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GatewaySimpleController.prototype, "refreshServices", null);
__decorate([
    (0, common_1.Get)('auth/:path*'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GatewaySimpleController.prototype, "handleAuthGet", null);
__decorate([
    (0, common_1.Post)('auth/:path*'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GatewaySimpleController.prototype, "handleAuthPost", null);
__decorate([
    (0, common_1.Put)('auth/:path*'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GatewaySimpleController.prototype, "handleAuthPut", null);
__decorate([
    (0, common_1.Patch)('auth/:path*'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GatewaySimpleController.prototype, "handleAuthPatch", null);
__decorate([
    (0, common_1.Delete)('auth/:path*'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GatewaySimpleController.prototype, "handleAuthDelete", null);
__decorate([
    (0, common_1.Get)('servers/:path*'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GatewaySimpleController.prototype, "handleServerGet", null);
__decorate([
    (0, common_1.Post)('servers/:path*'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GatewaySimpleController.prototype, "handleServerPost", null);
__decorate([
    (0, common_1.Put)('servers/:path*'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GatewaySimpleController.prototype, "handleServerPut", null);
__decorate([
    (0, common_1.Patch)('servers/:path*'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GatewaySimpleController.prototype, "handleServerPatch", null);
__decorate([
    (0, common_1.Delete)('servers/:path*'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GatewaySimpleController.prototype, "handleServerDelete", null);
__decorate([
    (0, common_1.Get)('memberships/:path*'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GatewaySimpleController.prototype, "handleMembershipGet", null);
__decorate([
    (0, common_1.Post)('memberships/:path*'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GatewaySimpleController.prototype, "handleMembershipPost", null);
__decorate([
    (0, common_1.Put)('memberships/:path*'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GatewaySimpleController.prototype, "handleMembershipPut", null);
__decorate([
    (0, common_1.Patch)('memberships/:path*'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GatewaySimpleController.prototype, "handleMembershipPatch", null);
__decorate([
    (0, common_1.Delete)('memberships/:path*'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GatewaySimpleController.prototype, "handleMembershipDelete", null);
__decorate([
    (0, common_1.Get)('profiles/:path*'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GatewaySimpleController.prototype, "handleProfileGet", null);
__decorate([
    (0, common_1.Post)('profiles/:path*'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GatewaySimpleController.prototype, "handleProfilePost", null);
__decorate([
    (0, common_1.Put)('profiles/:path*'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GatewaySimpleController.prototype, "handleProfilePut", null);
__decorate([
    (0, common_1.Patch)('profiles/:path*'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GatewaySimpleController.prototype, "handleProfilePatch", null);
__decorate([
    (0, common_1.Delete)('profiles/:path*'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GatewaySimpleController.prototype, "handleProfileDelete", null);
__decorate([
    (0, common_1.Get)('channels/:path*'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GatewaySimpleController.prototype, "handleChannelGet", null);
__decorate([
    (0, common_1.Post)('channels/:path*'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GatewaySimpleController.prototype, "handleChannelPost", null);
__decorate([
    (0, common_1.Put)('channels/:path*'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GatewaySimpleController.prototype, "handleChannelPut", null);
__decorate([
    (0, common_1.Patch)('channels/:path*'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GatewaySimpleController.prototype, "handleChannelPatch", null);
__decorate([
    (0, common_1.Delete)('channels/:path*'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GatewaySimpleController.prototype, "handleChannelDelete", null);
__decorate([
    (0, common_1.Get)('messages/:path*'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GatewaySimpleController.prototype, "handleMessageGet", null);
__decorate([
    (0, common_1.Post)('messages/:path*'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GatewaySimpleController.prototype, "handleMessagePost", null);
__decorate([
    (0, common_1.Put)('messages/:path*'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GatewaySimpleController.prototype, "handleMessagePut", null);
__decorate([
    (0, common_1.Patch)('messages/:path*'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GatewaySimpleController.prototype, "handleMessagePatch", null);
__decorate([
    (0, common_1.Delete)('messages/:path*'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GatewaySimpleController.prototype, "handleMessageDelete", null);
__decorate([
    (0, common_1.Get)('direct/:path*'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GatewaySimpleController.prototype, "handleDirectGet", null);
__decorate([
    (0, common_1.Post)('direct/:path*'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GatewaySimpleController.prototype, "handleDirectPost", null);
__decorate([
    (0, common_1.Put)('direct/:path*'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GatewaySimpleController.prototype, "handleDirectPut", null);
__decorate([
    (0, common_1.Patch)('direct/:path*'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GatewaySimpleController.prototype, "handleDirectPatch", null);
__decorate([
    (0, common_1.Delete)('direct/:path*'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GatewaySimpleController.prototype, "handleDirectDelete", null);
__decorate([
    (0, common_1.Get)('conversations/:path*'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GatewaySimpleController.prototype, "handleConversationGet", null);
__decorate([
    (0, common_1.Post)('conversations/:path*'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GatewaySimpleController.prototype, "handleConversationPost", null);
__decorate([
    (0, common_1.Put)('conversations/:path*'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GatewaySimpleController.prototype, "handleConversationPut", null);
__decorate([
    (0, common_1.Patch)('conversations/:path*'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GatewaySimpleController.prototype, "handleConversationPatch", null);
__decorate([
    (0, common_1.Delete)('conversations/:path*'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GatewaySimpleController.prototype, "handleConversationDelete", null);
exports.GatewaySimpleController = GatewaySimpleController = GatewaySimpleController_1 = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [gateway_service_1.GatewayService])
], GatewaySimpleController);
//# sourceMappingURL=gateway-simple.controller.js.map