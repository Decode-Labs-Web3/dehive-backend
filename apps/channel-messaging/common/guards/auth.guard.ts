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
      "🔥 [CHANNEL-MESSAGING AUTH GUARD] Constructor called - This is the channel-messaging AuthGuard!",
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    console.log(
      "🚨 [CHANNEL-MESSAGING AUTH GUARD] canActivate called - This is the channel-messaging AuthGuard!",
    );
    const request = context.switchToHttp().getRequest<Request>();

    // Check if route is marked as public
    const isPublic = new Reflector().get<boolean>(
      PUBLIC_KEY,
      context.getHandler(),
    );
    console.log("🚨 [CHANNEL-MESSAGING AUTH GUARD] isPublic:", isPublic);
    if (isPublic) {
      console.log(
        "🚨 [CHANNEL-MESSAGING AUTH GUARD] Route is public, skipping auth",
      );
      return true;
    }

    // Extract session_id from request headers
    const sessionId = this.extractSessionIdFromHeader(request);
    console.log("🚨 [CHANNEL-MESSAGING AUTH GUARD] sessionId:", sessionId);
    if (!sessionId) {
      console.log("❌ [CHANNEL-MESSAGING AUTH GUARD] No session ID found!");
      throw new UnauthorizedException({
        message: "Session ID is required",
        error: "MISSING_SESSION_ID",
      });
    }

    try {
      // Call auth service to validate session and get user data
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
        // Use _id from Auth service directly as userId for Dehive
        request["user"] = {
          userId: sessionData.user._id,
          email: sessionData.user.email || "",
          username: sessionData.user.username || "",
          role: "user" as const,
          session_id: sessionId,
          fingerprint_hash: request.headers["x-fingerprint-hashed"] as
            | string
            | undefined,
        };
        request["sessionId"] = sessionId;
        console.log(
          "✅ [CHANNEL-MESSAGING AUTH GUARD] User attached to request:",
          request["user"],
        );
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
