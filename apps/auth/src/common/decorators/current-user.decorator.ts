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
    const request = ctx
      .switchToHttp()
      .getRequest<{ user: AuthenticatedUser }>();
    const user = request.user;

    // If a specific property is requested, return only that property
    if (data && user) {
      return user[data];
    }

    // Return the entire user object
    return user;
  },
);
