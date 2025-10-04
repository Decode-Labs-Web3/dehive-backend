import { ConfigService } from '@nestjs/config';
import { Strategy } from 'passport-jwt';
interface JwtPayload {
    id: string;
    email: string;
}
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private readonly configService;
    constructor(configService: ConfigService);
    validate(payload: JwtPayload): {
        id: string;
        email: string;
    };
}
export {};
