"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var HttpExceptionFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("axios");
let HttpExceptionFilter = HttpExceptionFilter_1 = class HttpExceptionFilter {
    logger = new common_1.Logger(HttpExceptionFilter_1.name);
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        let status;
        let message;
        let error;
        if (exception instanceof common_1.HttpException) {
            status = exception.getStatus();
            const exceptionResponse = exception.getResponse();
            if (typeof exceptionResponse === 'string') {
                message = exceptionResponse;
            }
            else if (typeof exceptionResponse === 'object' &&
                exceptionResponse !== null) {
                const responseObj = exceptionResponse;
                message = responseObj.message || exception.message;
                error =
                    typeof responseObj.error === 'string' ||
                        typeof responseObj.error === 'object'
                        ? responseObj.error
                        : 'Service communication failed';
            }
            else {
                message = exception.message;
            }
        }
        else if (exception instanceof axios_1.AxiosError) {
            if (exception.response) {
                status = exception.response.status;
                const responseData = exception.response.data;
                message = responseData?.message || 'External service error';
                const errorData = responseData?.error;
                error =
                    typeof errorData === 'string' || typeof errorData === 'object'
                        ? errorData
                        : 'Service communication failed';
            }
            else if (exception.request) {
                status = common_1.HttpStatus.SERVICE_UNAVAILABLE;
                message = 'Service temporarily unavailable';
                error = 'External service is not responding';
            }
            else {
                status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
                message = 'Internal server error';
                error = 'Network configuration error';
            }
        }
        else if (exception instanceof Error) {
            status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
            message = 'Internal server error';
            error = exception.message;
        }
        else {
            status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
            message = 'Internal server error';
            error = 'Unknown error occurred';
        }
        this.logger.error(`${request.method} ${request.url} - ${status}: ${message}`);
        const errorResponse = {
            success: false,
            statusCode: status,
            message,
            error,
            timestamp: new Date().toISOString(),
            path: request.url,
        };
        response.status(status).json(errorResponse);
    }
};
exports.HttpExceptionFilter = HttpExceptionFilter;
exports.HttpExceptionFilter = HttpExceptionFilter = HttpExceptionFilter_1 = __decorate([
    (0, common_1.Catch)()
], HttpExceptionFilter);
//# sourceMappingURL=http-exception.filter.js.map