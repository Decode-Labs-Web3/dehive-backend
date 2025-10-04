import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser } from '../../interfaces/authenticated-user.interface';

/**
 * CurrentUser decorator to extract authenticated user data from the request
 *
 * This decorator extracts the user data that was attached to the request
 * by the AuthGuard after successful authentication.
 *
 * @example
 * ```typescript
 * @Get('profile')
 * @UseGuards(AuthGuard)
 * async getProfile(@CurrentUser() user: AuthenticatedUser) {
 *   return { userId: user.userId, username: user.username };
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (
    data: keyof AuthenticatedUser | undefined,
    ctx: ExecutionContext,
  ): AuthenticatedUser | string | undefined => {
    console.log('🎯 [USER-DEHIVE CURRENT USER] Decorator called with data:', data);
    try {
      const request = ctx
        .switchToHttp()
        .getRequest<{ user: AuthenticatedUser }>();
      const user = request.user;

      console.log('🎯 [USER-DEHIVE CURRENT USER] Request user:', user);

      // If a specific property is requested, return only that property
      if (data && user) {
        console.log(`🎯 [USER-DEHIVE CURRENT USER] Returning user.${data}:`, user[data]);
        return user[data] as string;
      }

      // Return the entire user object
      console.log('🎯 [USER-DEHIVE CURRENT USER] Returning full user:', user);
      return user;
    } catch (error) {
      console.error('❌ [USER-DEHIVE CURRENT USER] Error:', error);
      return undefined;
    }
  },
);
