import { TestAuthService } from './test-auth.service';
import { AuthenticatedUser } from './interfaces/authenticated-user.interface';
export declare class TestAuthController {
    private readonly testAuthService;
    constructor(testAuthService: TestAuthService);
    getPublicMessage(): {
        message: string;
        timestamp: string;
    };
    getProtectedMessage(user: AuthenticatedUser): {
        message: string;
        user: AuthenticatedUser;
        timestamp: string;
    };
}
