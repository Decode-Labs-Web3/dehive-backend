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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseHttpClient = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
let BaseHttpClient = class BaseHttpClient {
    httpService;
    baseURL;
    logger = new common_1.Logger(this.constructor.name);
    constructor(httpService, baseURL) {
        this.httpService = httpService;
        this.baseURL = baseURL;
    }
    async get(url, config) {
        try {
            console.log('base http client get', `${this.baseURL}${url}`, config);
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`${this.baseURL}${url}`, config));
            console.log('base http client response', response.data);
            return response.data;
        }
        catch (error) {
            this.handleError(error, 'GET', url);
        }
    }
    async post(url, data, config) {
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(`${this.baseURL}${url}`, data, config));
            return response.data;
        }
        catch (error) {
            this.handleError(error, 'POST', url);
        }
    }
    async put(url, data, config) {
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.put(`${this.baseURL}${url}`, data, config));
            return response.data;
        }
        catch (error) {
            this.handleError(error, 'PUT', url);
        }
    }
    async delete(url, config) {
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.delete(`${this.baseURL}${url}`, config));
            return response.data;
        }
        catch (error) {
            this.handleError(error, 'DELETE', url);
        }
    }
    handleError(error, method, url) {
        this.logger.error(`HTTP ${method} ${this.baseURL}${url} failed: ${error instanceof Error ? error.message : String(error)}`);
        if (error?.response) {
            throw error;
        }
        throw new Error(`Network error: ${error instanceof Error ? error.message : String(error)}`);
    }
};
exports.BaseHttpClient = BaseHttpClient;
exports.BaseHttpClient = BaseHttpClient = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService, String])
], BaseHttpClient);
//# sourceMappingURL=base-http.client.js.map