import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { AuthenticatedUser } from "../../interfaces/authenticated-user.interface";

export const CurrentUser = createParamDecorator(
  (
    data: keyof AuthenticatedUser | undefined,
    ctx: ExecutionContext,
  ): AuthenticatedUser | string | undefined => {
    console.log(
      "🎯 [USER-DEHIVE CURRENT USER] Decorator called with data:",
      data,
    );
    try {
      const request = ctx
        .switchToHttp()
        .getRequest<{ user: AuthenticatedUser }>();
      const user = request.user;

      console.log("🎯 [USER-DEHIVE CURRENT USER] Request user:", user);

      // If a specific property is requested, return only that property
      if (data && user) {
        console.log(
          `🎯 [USER-DEHIVE CURRENT USER] Returning user.${data}:`,
          user[data],
        );
        return user[data] as string;
      }

      // Return the entire user object
      console.log("🎯 [USER-DEHIVE CURRENT USER] Returning full user:", user);
      return user;
    } catch (error) {
      console.error("❌ [USER-DEHIVE CURRENT USER] Error:", error);
      return undefined;
    }
  },
);
