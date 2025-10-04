import { SessionService } from './services/session.service';
import { RegisterService } from './services/register.service';
import { UserService } from './services/user.service';
export declare class AuthController {
    private readonly sessionService;
    private readonly registerService;
    private readonly userService;
    constructor(sessionService: SessionService, registerService: RegisterService, userService: UserService);
    createSession(body: {
        sso_token: string;
        fingerprint_hashed: string;
    }): Promise<import("./interfaces/response.interface").Response<unknown>>;
    createDehiveAccount(body: {
        user_id: string;
    }): Promise<import("./interfaces/response.interface").Response<import("./interfaces/user-doc.interface").UserDehiveDoc>>;
    checkSession(sessionId: string): Promise<import("./interfaces/response.interface").Response<unknown>>;
    checkSessionPost(body: {
        session_id: string;
    }): Promise<import("./interfaces/response.interface").Response<unknown>>;
    getUserProfile(param: {
        user_id: string;
    }, headers: {
        'x-session-id': string;
        'x-fingerprint-hashed': string;
    }): Promise<import("./interfaces/response.interface").Response<import("./interfaces/user-doc.interface").UserDehiveDoc>>;
    getMyProfile(headers: {
        'x-session-id': string;
        'x-fingerprint-hashed': string;
    }): Promise<import("./interfaces/response.interface").Response<import("./interfaces/user-doc.interface").UserDehiveDoc>>;
}
