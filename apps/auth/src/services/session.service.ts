import { BadRequestException, HttpStatus, Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

// Interfaces
import { Response } from '../interfaces/response.interface';
import { SessionDoc } from '../interfaces/session-doc.interface';

// Infrastructure Services
import { DecodeApiClient } from '../infrastructure/external-services/decode-api.client';
import { RedisInfrastructure } from '../infrastructure/redis.infrastructure';

// Services
import { UserService } from './user.service';
import { RegisterService } from './register.service';
import { SessionCacheDoc } from '../interfaces/session-doc.interface';

@Injectable()
export class SessionService {
  constructor(
    private readonly decodeApiClient: DecodeApiClient,
    private readonly redis: RedisInfrastructure,
    private readonly userService: UserService,
    private readonly registerService: RegisterService,
  ) {}

  async createDecodeSession(sso_token: string): Promise<Response> {
    const create_decode_session_response: Response<SessionDoc> =
      await this.decodeApiClient.createDecodeSession(sso_token);
    if (
      !create_decode_session_response.success ||
      !create_decode_session_response.data
    ) {
      throw new BadRequestException(
        'Failed to create decode session',
        create_decode_session_response.message,
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
    const session_id = await this.storeSession(
      create_decode_session_response.data,
    );

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Decode session created',
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
        message: 'Session not found',
        statusCode: HttpStatus.NOT_FOUND,
      };
    }
    return {
      success: true,
      message: 'Session found',
      statusCode: HttpStatus.OK,
    };
  }

  private async storeSession(session_data: SessionDoc): Promise<string> {
    const session_id = uuidv4();
    const session_key = `session:${session_id}`;
    const session_value = {
      access_token: session_data.access_token,
      session_token: session_data.session_token,
    };
    const expires_countdown = Math.floor(
      (new Date(session_data.expires_at).getTime() - Date.now()) / 1000,
    );
    await this.redis.set(session_key, session_value, expires_countdown);
    return session_id;
  }
}
