import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { BaseHttpClient } from './base-http.client';
import { ConfigService } from '@nestjs/config';
import { Response } from '../../interfaces/response.interface';
import {
  SessionCacheDoc,
  SessionDoc,
} from '../../interfaces/session-doc.interface';
import { UserDecodeDoc } from '../../interfaces/user-doc.interface';
import { RedisInfrastructure } from '../redis.infrastructure';

@Injectable()
export class DecodeApiClient extends BaseHttpClient {
  constructor(
    httpService: HttpService,
    configService: ConfigService,
    private readonly redisInfrastructure: RedisInfrastructure,
  ) {
    super(
      httpService,
      configService.get<string>('services.decode_api_gateway.url') ||
        'http://localhost:4000',
    );
  }

  async createDecodeSession(sso_token: string): Promise<Response<SessionDoc>> {
    const session_response = await this.post<SessionDoc>('/auth/sso/validate', {
      sso_token: sso_token,
    });
    return session_response;
  }

  async refreshDecodeSession(
    refresh_token: string,
  ): Promise<Response<SessionDoc>> {
    return this.post<SessionDoc>('/auth/refresh-session', {
      refresh_token: refresh_token,
    });
  }

  async getUser(
    user_id: string,
    session_id: string,
    fingerprint_hashed: string,
  ): Promise<Response<UserDecodeDoc>> {
    const access_token = await this.getAccessToken(session_id);
    const config = {
      headers: {
        Authorization: 'Bearer ' + access_token,
        'X-Fingerprint-Hashed': fingerprint_hashed,
      },
    };
    const user_decode_response = await this.get<UserDecodeDoc>(
      `/users/profile/${user_id}`,
      config,
    );
    return user_decode_response;
  }

  async getMyProfile(
    session_id: string,
    fingerprint_hashed: string,
  ): Promise<Response<UserDecodeDoc>> {
    const access_token = await this.getAccessToken(session_id);
    const config = {
      headers: {
        Authorization: 'Bearer ' + access_token,
        'X-Fingerprint-Hashed': fingerprint_hashed,
      },
    };
    return this.get<UserDecodeDoc>(`/users/profile/me`, config);
  }

  private async getAccessToken(session_id: string): Promise<string> {
    const session_key = `session:${session_id}`;
    const session_data: SessionCacheDoc = (await this.redisInfrastructure.get(
      session_key,
    )) as SessionCacheDoc;
    return session_data.access_token;
  }
}
