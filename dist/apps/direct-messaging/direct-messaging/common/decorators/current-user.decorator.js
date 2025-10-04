"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrentUser = void 0;
const common_1 = require("@nestjs/common");
exports.CurrentUser = (0, common_1.createParamDecorator)((data, ctx) => {
    console.log('🎯 [DIRECT-MESSAGING CURRENT USER] Decorator called with data:', data);
    try {
        const request = ctx
            .switchToHttp()
            .getRequest();
        console.log('🎯 [DIRECT-MESSAGING CURRENT USER] Request user:', request.user);
        console.log('🎯 [DIRECT-MESSAGING CURRENT USER] Request sessionId:', request.sessionId);
        if (data === 'sessionId') {
            return request.sessionId;
        }
        const user = request.user;
        if (data && user) {
            console.log(`🎯 [DIRECT-MESSAGING CURRENT USER] Returning user.${data}:`, user[data]);
            return user[data];
        }
        console.log('🎯 [DIRECT-MESSAGING CURRENT USER] Returning full user:', user);
        return user;
    }
    catch (error) {
        console.error('❌ [DIRECT-MESSAGING CURRENT USER] Error:', error);
        return undefined;
    }
});
//# sourceMappingURL=current-user.decorator.js.map