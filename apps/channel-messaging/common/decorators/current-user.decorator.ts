import { createParamDecorator, ExecutionContext, Logger } from "@nestjs/common";
import { AuthenticatedUser } from "../../interfaces/authenticated-user.interface";

const logger = new Logger("CurrentUserDecorator");

export const CurrentUser = createParamDecorator(
  (
    data: keyof AuthenticatedUser | "sessionId" | undefined,
    ctx: ExecutionContext,
  ): AuthenticatedUser | unknown => {
    logger.debug(
      "🎯 [CHANNEL-MESSAGING CURRENT USER] Decorator called with data:",
      data,
    );
    try {
      const request = ctx
        .switchToHttp()
        .getRequest<{ user: AuthenticatedUser; sessionId?: string }>();

      logger.debug(
        "🎯 [CHANNEL-MESSAGING CURRENT USER] Request user:",
        request.user,
      );
      logger.debug(
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
        logger.debug(
          `🎯 [CHANNEL-MESSAGING CURRENT USER] Returning user.${data}:`,
          user[data],
        );
        return user[data];
      }

      // Return the entire user object
      logger.debug(
        "🎯 [CHANNEL-MESSAGING CURRENT USER] Returning full user:",
        user,
      );
      return user;
    } catch (error) {
      logger.error("❌ [CHANNEL-MESSAGING CURRENT USER] Error:", String(error));
      return undefined;
    }
  },
);
