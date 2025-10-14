import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
  SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { HttpService } from "@nestjs/axios";
import { AxiosError } from "axios";
import { firstValueFrom } from "rxjs";
import { Request } from "express";
import { ConfigService } from "@nestjs/config";

// Interfaces
import { SessionCacheDoc } from "../../interfaces/session-doc.interface";

// Decorators for public routes
export const PUBLIC_KEY = "public";
export const Public = () => SetMetadata(PUBLIC_KEY, true);

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);
  private readonly authServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {
    const host = this.configService.get<string>("DECODE_API_GATEWAY_HOST");
    const port = this.configService.get<number>("DECODE_API_GATEWAY_PORT");
    if (!host || !port) {
      throw new Error(
        "DECODE_API_GATEWAY_HOST and DECODE_API_GATEWAY_PORT must be set in .env file!",
      );
    }
    this.authServiceUrl = `http://${host}:${port}`;
    console.log(
      "🔥 [SERVER AUTH GUARD] Constructor called - This is the server AuthGuard!",
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    console.log(
      "🚨 [SERVER AUTH GUARD] canActivate called - This is the server AuthGuard!",
    );
    const request = context.switchToHttp().getRequest<Request>();

    // Check if route is marked as public
    const isPublic = this.reflector.get<boolean>(
      PUBLIC_KEY,
      context.getHandler(),
    );
    console.log("🚨 [SERVER AUTH GUARD] isPublic:", isPublic);
    if (isPublic) {
      console.log("🚨 [SERVER AUTH GUARD] Route is public, skipping auth");
      return true;
    }

    // Extract session_id from request headers
    const sessionId = this.extractSessionIdFromHeader(request);
    console.log("🚨 [SERVER AUTH GUARD] sessionId:", sessionId);
    if (!sessionId) {
      console.log("❌ [SERVER AUTH GUARD] No session ID found!");
      throw new UnauthorizedException({
        message: "Session ID is required",
        error: "MISSING_SESSION_ID",
      });
    }

    try {
      // Call auth service to validate session and get user data
      console.log(
        "🔐 [SERVER AUTH GUARD] Calling auth service for session validation",
      );

      const response = await firstValueFrom(
        this.httpService.get<{ data: SessionCacheDoc }>(
          `${this.authServiceUrl}/auth/sso/validate`,
          {
            headers: { "x-session-id": sessionId },
          },
        ),
      );

      const sessionData = response.data.data;
      if (!sessionData || !sessionData.access_token) {
        throw new UnauthorizedException(
          "Invalid session data from auth service",
        );
      }

      // Attach user to request for use in controllers
      if (sessionData) {
        // Use session data directly - no need to call /auth/profile
        console.log("🔐 [SERVER AUTH GUARD] Using session data directly");

        // Decode JWT token to get user_id
        const sessionToken = sessionData.session_token;

        if (sessionToken) {
          // Decode JWT payload (base64 decode)
          const payload = sessionToken.split(".")[1];
          const decodedPayload = JSON.parse(
            Buffer.from(payload, "base64").toString(),
          );
          const userId = decodedPayload.user_id;
          console.log(
            "🔍 [SERVER AUTH GUARD] JWT decodedPayload:",
            decodedPayload,
          );
          console.log("🔍 [SERVER AUTH GUARD] userId from JWT:", userId);

          if (userId) {
            request["user"] = {
              _id: userId,
              userId: userId,
              email: "user@example.com",
              username: "user",
              role: "user" as const,
            };
            request["sessionId"] = sessionId;
            console.log(
              "✅ [SERVER AUTH GUARD] User attached to request:",
              request["user"],
            );
          } else {
            throw new UnauthorizedException({
              message: "No user_id in JWT token",
              error: "NO_USER_ID_IN_JWT",
            });
          }
        } else {
          throw new UnauthorizedException({
            message: "No session token available",
            error: "NO_SESSION_TOKEN",
          });
        }
      }

      return true;
    } catch (error) {
      if (error instanceof AxiosError) {
        if (error.response?.status === 401) {
          throw new UnauthorizedException({
            message: "Invalid or expired session",
            error: "SESSION_EXPIRED",
          });
        }

        this.logger.error("Auth service is unavailable");
        throw new UnauthorizedException({
          message: "Authentication service unavailable",
          error: "SERVICE_UNAVAILABLE",
        });
      }

      // If it's already a NestJS exception, re-throw it
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      // Log the error for debugging
      this.logger.error(
        `Authentication failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );

      // Convert unknown errors to UnauthorizedException
      throw new UnauthorizedException({
        message: "Authentication failed",
        error: "AUTHENTICATION_ERROR",
      });
    }
  }

  private extractSessionIdFromHeader(request: Request): string | undefined {
    return request.headers["x-session-id"] as string | undefined;
  }
}
