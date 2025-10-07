import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { HttpService } from '@nestjs/axios';
import { Redis } from 'ioredis';
import { ConfigService } from '@nestjs/config';
export declare const PUBLIC_KEY = "public";
export declare const Public: () => import("@nestjs/common").CustomDecorator<string>;
export declare class AuthGuard implements CanActivate {
    private readonly httpService;
    private readonly reflector;
    private readonly configService;
    private readonly redis;
    private readonly logger;
    private readonly authServiceUrl;
    constructor(httpService: HttpService, reflector: Reflector, configService: ConfigService, redis: Redis);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
