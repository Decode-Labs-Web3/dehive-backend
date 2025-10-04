import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ServicesJwtPayload } from '../interfaces/jwt-payload.interface';
import { Response } from '../interfaces/response.interface';
declare const ServicesJwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class ServicesJwtStrategy extends ServicesJwtStrategy_base {
    private readonly jwtService;
    private readonly configService;
    private readonly logger;
    constructor(jwtService: JwtService, configService: ConfigService);
    validate(payload: ServicesJwtPayload): {
        from_service: string;
        to_service: string;
    };
    validateServicesToken(services_token: string): Response<ServicesJwtPayload>;
}
export {};
