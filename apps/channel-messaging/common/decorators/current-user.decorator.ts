import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { AuthenticatedUser } from "../../interfaces/authenticated-user.interface";

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
    data: keyof AuthenticatedUser | "sessionId" | undefined,
    ctx: ExecutionContext,
  ): AuthenticatedUser | string | null | undefined => {
    console.log(
      "🎯 [CHANNEL-MESSAGING CURRENT USER] Decorator called with data:",
      data,
    );
    try {
      const request = ctx
        .switchToHttp()
        .getRequest<{ user: AuthenticatedUser; sessionId?: string }>();

      console.log(
        "🎯 [CHANNEL-MESSAGING CURRENT USER] Request user:",
        request.user,
      );
      console.log(
        "🎯 [CHANNEL-MESSAGING CURRENT USER] Request sessionId:",
        request.sessionId,
      );

      // If sessionId is requested, return it from request
      if (data === "sessionId") {
        return request.sessionId;
      }

      const user = request.user;

      // If a specific property is requested, return only that property
      if (data && user) {
        console.log(
          `🎯 [CHANNEL-MESSAGING CURRENT USER] Returning user.${data}:`,
          user[data],
        );
        return user[data];
      }

      // Return the entire user object
      console.log(
        "🎯 [CHANNEL-MESSAGING CURRENT USER] Returning full user:",
        user,
      );
      return user;
    } catch (error) {
      console.error("❌ [CHANNEL-MESSAGING CURRENT USER] Error:", error);
      return undefined;
    }
  },
);
