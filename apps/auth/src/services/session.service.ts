import { BadRequestException, HttpStatus, Injectable } from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";

// Interfaces
import { Response } from "../interfaces/response.interface";
import { SessionDoc } from "../interfaces/session-doc.interface";

// Infrastructure Services
import { DecodeApiClient } from "../infrastructure/external-services/decode-api.client";
import { RedisInfrastructure } from "../infrastructure/redis.infrastructure";

// Services
import { UserService } from "./user.service";
import { RegisterService } from "./register.service";
import { SessionCacheDoc } from "../interfaces/session-doc.interface";
import { AuthenticatedUser } from "../interfaces/authenticated-user.interface";
import { UserProfile } from "apps/user-dehive-server/interfaces/user-profile.interface";

@Injectable()
export class SessionService {
  constructor(
    private readonly decodeApiClient: DecodeApiClient,
    private readonly redis: RedisInfrastructure,
    private readonly userService: UserService,
    private readonly registerService: RegisterService,
  ) {}

  async createDecodeSession(
    sso_token: string,
    fingerprint_hashed: string,
  ): Promise<Response> {
    const create_decode_session_response: Response<SessionDoc> =
      await this.decodeApiClient.createDecodeSession(sso_token);

    // Enhanced null checking
    if (
      !create_decode_session_response ||
      !create_decode_session_response.success ||
      !create_decode_session_response.data ||
      !create_decode_session_response.data.access_token
    ) {
      throw new BadRequestException(
        "Failed to create decode session",
        create_decode_session_response?.message ||
          "Invalid response from decode API",
      );
    }

    const user_exists = await this.userService.userExists(
      create_decode_session_response.data.user_id.toString(),
    );
    if (!user_exists.success) {
      const register_response = await this.registerService.register(
        create_decode_session_response.data.user_id.toString(),
      );
      if (!register_response.success) {
        return {
          success: false,
          message: register_response.message,
          statusCode: register_response.statusCode,
        };
      }
    }

    // Store the session first to get a session_id
    const session_id = await this.storeSession(
      create_decode_session_response.data,
      null, // We'll update this with user profile data later
    );

    // Now call getMyProfile with the session_id instead of access_token
    const user_profile_response = await this.decodeApiClient.getMyProfile(
      session_id,
      fingerprint_hashed,
    );
    if (
      !user_profile_response ||
      !user_profile_response.success ||
      !user_profile_response.data
    ) {
      throw new BadRequestException(
        "Failed to get user profile after creating session",
        user_profile_response?.message || "Invalid user profile response",
      );
    }
    const user_profile_data = user_profile_response.data;

    const user_dehive_data = await this.userService.userExists(
      user_profile_data._id,
    );
    if (!user_dehive_data.success) {
      await this.registerService.register(user_profile_data._id);
    }

    // Update the session with user profile data
    await this.updateSessionWithUserProfile(
      session_id,
      user_profile_data as unknown as UserProfile,
    );

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: "Decode session created",
      data: {
        session_id: session_id,
        expires_at: create_decode_session_response.data?.expires_at,
      },
    };
  }

  // Check if the session is valid
  async checkValidSession(session_id: string): Promise<Response> {
    const session_data: SessionCacheDoc = (await this.redis.get(
      `session:${session_id}`,
    )) as SessionCacheDoc;
    if (!session_data) {
      return {
        success: false,
        message: "Session not found",
        statusCode: HttpStatus.NOT_FOUND,
      };
    }
    return {
      success: true,
      message: "Session found",
      statusCode: HttpStatus.OK,
      data: session_data,
    };
  }

  private async storeSession(
    session_data: SessionDoc,
    user_profile_data: UserProfile | null,
  ): Promise<string> {
    const session_id = uuidv4();
    const session_key = `session:${session_id}`;
    const session_value = {
      session_token: session_data.session_token,
      access_token: session_data.access_token,
      expires_at: session_data.expires_at,
      user: user_profile_data
        ? (user_profile_data as unknown as AuthenticatedUser)
        : null,
    };

    const expires_countdown = Math.floor(
      (new Date(session_data.expires_at).getTime() - Date.now()) / 1000,
    );
    await this.redis.set(session_key, session_value, expires_countdown);
    return session_id;
  }

  private async updateSessionWithUserProfile(
    session_id: string,
    user_profile_data: UserProfile,
  ): Promise<void> {
    const session_key = `session:${session_id}`;
    const existing_session = (await this.redis.get(
      session_key,
    )) as SessionCacheDoc;

    if (existing_session) {
      const updated_session = {
        ...existing_session,
        user: user_profile_data as unknown as AuthenticatedUser,
      };

      const expires_countdown = Math.floor(
        (new Date(existing_session.expires_at).getTime() - Date.now()) / 1000,
      );

      await this.redis.set(session_key, updated_session, expires_countdown);
    }
  }
}
