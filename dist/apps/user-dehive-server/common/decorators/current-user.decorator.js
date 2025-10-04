"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrentUser = void 0;
const common_1 = require("@nestjs/common");
exports.CurrentUser = (0, common_1.createParamDecorator)((data, ctx) => {
    console.log('🎯 [USER-DEHIVE CURRENT USER] Decorator called with data:', data);
    try {
        const request = ctx
            .switchToHttp()
            .getRequest();
        const user = request.user;
        console.log('🎯 [USER-DEHIVE CURRENT USER] Request user:', user);
        if (data && user) {
            console.log(`🎯 [USER-DEHIVE CURRENT USER] Returning user.${data}:`, user[data]);
            return user[data];
        }
        console.log('🎯 [USER-DEHIVE CURRENT USER] Returning full user:', user);
        return user;
    }
    catch (error) {
        console.error('❌ [USER-DEHIVE CURRENT USER] Error:', error);
        return undefined;
    }
});
//# sourceMappingURL=current-user.decorator.js.map