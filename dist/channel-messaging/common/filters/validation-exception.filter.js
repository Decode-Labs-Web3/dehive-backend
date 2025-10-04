"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var ValidationExceptionFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
let ValidationExceptionFilter = ValidationExceptionFilter_1 = class ValidationExceptionFilter {
    logger = new common_1.Logger(ValidationExceptionFilter_1.name);
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const exceptionResponse = exception.getResponse();
        let validationDetails = [];
        if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
            const responseObj = exceptionResponse;
            if (Array.isArray(responseObj.message)) {
                validationDetails = responseObj.message.map((msg) => ({
                    field: 'unknown',
                    message: msg,
                }));
            }
            else if (responseObj.message) {
                validationDetails = [
                    {
                        field: 'request',
                        message: responseObj.message,
                    },
                ];
            }
        }
        this.logger.warn(`Validation failed for ${request.method} ${request.url}: ${validationDetails.map((d) => d.message).join(', ')}`);
        const errorResponse = {
            success: false,
            statusCode: 400,
            message: 'Validation failed',
            error: {
                type: 'validation',
                details: validationDetails,
            },
            timestamp: new Date().toISOString(),
            path: request.url,
        };
        response.status(400).json(errorResponse);
    }
};
exports.ValidationExceptionFilter = ValidationExceptionFilter;
exports.ValidationExceptionFilter = ValidationExceptionFilter = ValidationExceptionFilter_1 = __decorate([
    (0, common_1.Catch)(common_1.BadRequestException)
], ValidationExceptionFilter);
//# sourceMappingURL=validation-exception.filter.js.map