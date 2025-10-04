import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { HttpService } from '@nestjs/axios';
export declare const PUBLIC_KEY = "public";
export declare const Public: () => import("@nestjs/common").CustomDecorator<string>;
export declare class AuthGuard implements CanActivate {
    private readonly httpService;
    private readonly reflector;
    private readonly logger;
    private readonly authServiceUrl;
    constructor(httpService: HttpService, reflector: Reflector);
    canActivate(context: ExecutionContext): Promise<boolean>;
    private extractSessionIdFromHeader;
}
