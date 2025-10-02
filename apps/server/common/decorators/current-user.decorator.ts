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
    data: keyof AuthenticatedUser | 'sessionId' | undefined,
    ctx: ExecutionContext,
  ): AuthenticatedUser | string | undefined => {
    try {
      console.log('🎯 [CURRENT USER] Decorator called with data:', data);
      const request = ctx
        .switchToHttp()
        .getRequest<{ user: AuthenticatedUser; sessionId?: string }>();

      console.log('🎯 [CURRENT USER] request.user:', request.user);
      console.log('🎯 [CURRENT USER] request.sessionId:', request.sessionId);
      console.log('🎯 [CURRENT USER] request keys:', Object.keys(request));

    // If sessionId is requested, return it from request
    if (data === 'sessionId') {
      console.log('🎯 [CURRENT USER] Returning sessionId:', request.sessionId);
      return request.sessionId;
    }

    const user = request.user;

    // If a specific property is requested, return only that property
    if (data && user) {
      console.log(
        '🎯 [CURRENT USER] Returning user property:',
        data,
        '=',
        user[data],
      );
      return user[data];
    }

    // Return the entire user object
    console.log('🎯 [CURRENT USER] Returning entire user object:', user);
    return user;
    } catch (error) {
      console.log('💥 [CURRENT USER] Error in decorator:', error);
      return undefined;
    }
  },
);
