import { HttpStatus, Injectable } from '@nestjs/common';
import { DecodeApiClient } from '../infrastructure/external-services/decode-api.client';
import { UserDecodeDoc } from '../interfaces/user-doc.interface';
import { Response } from '../interfaces/response.interface';
import { UserDehive } from '../schemas/user-dehive.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserDehiveDoc } from '../interfaces/user-doc.interface';
import { RedisInfrastructure } from '../infrastructure/redis.infrastructure';
import { SessionCacheDoc } from '../interfaces/session-doc.interface';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

@Injectable()
export class UserService {
  constructor(
    private readonly decodeApiClient: DecodeApiClient,
    @InjectModel('UserDehive')
    private readonly userDehiveModel: Model<UserDehive>,
    private readonly redis: RedisInfrastructure,
  ) {}

  async getUser(input: {
    user_dehive_id: string;
    session_id: string;
    fingerprint_hashed: string;
  }): Promise<Response<UserDehiveDoc>> {
    const { user_dehive_id, session_id, fingerprint_hashed } = input;
    try {
      const user_decode = await this.getUserDecodeProfile({
        user_id: user_dehive_id,
        session_id,
        fingerprint_hashed,
      });
      if (!user_decode.success || !user_decode.data) {
        return {
          success: false,
          message: user_decode.message,
          statusCode: user_decode.statusCode,
        };
      }
      const user_decode_data = user_decode.data;
      const user_dehive_data =
        await this.userDehiveModel.findById(user_dehive_id);
      if (!user_dehive_data) {
        return {
          success: false,
          message: 'User not found',
          statusCode: HttpStatus.NOT_FOUND,
        };
      }
      const user = {
        _id: user_dehive_data._id,
        dehive_role: user_dehive_data.dehive_role,
        role_subscription: user_dehive_data.role_subscription,
        status: user_dehive_data.status,
        server_count: user_dehive_data.server_count,
        username: user_decode_data.username,
        display_name: user_decode_data.display_name,
        bio: user_decode_data.bio,
        avatar_ipfs_hash: user_decode_data.avatar_ipfs_hash,
        last_login: user_decode_data.last_login,
        primary_wallet: user_decode_data.primary_wallet,
        following_number: user_decode_data.following_number,
        followers_number: user_decode_data.followers_number,
        is_following: user_decode_data.is_following,
        is_follower: user_decode_data.is_follower,
        is_blocked: user_decode_data.is_blocked,
        is_blocked_by: user_decode_data.is_blocked_by,
        mutual_followers_number: user_decode_data.mutual_followers_number,
        mutual_followers_list: user_decode_data.mutual_followers_list,
        is_active: user_decode_data.is_active,
        last_account_deactivation: user_decode_data.last_account_deactivation,
      };
      return {
        success: true,
        message: 'User found',
        statusCode: HttpStatus.OK,
        data: user as unknown as UserDehiveDoc,
      };
    } catch (error) {
      return {
        success: false,
        message: (error as Error).message,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async getMyProfile(input: {
    session_id: string;
    fingerprint_hashed: string;
  }): Promise<Response<UserDehiveDoc>> {
    const { session_id, fingerprint_hashed } = input;
    try {
      const user_decode = await this.getMyDecodeProfile({
        session_id,
        fingerprint_hashed,
      });
      if (!user_decode.success || !user_decode.data) {
        return {
          success: false,
          message: user_decode.message,
          statusCode: HttpStatus.NOT_FOUND,
        };
      }
      const user_decode_data = user_decode.data;
      const user_dehive_data = await this.userDehiveModel.findById(
        user_decode_data._id,
      );
      console.log(
        'user service get my decode profile user_dehive_data',
        user_dehive_data,
      );
      if (!user_dehive_data) {
        return {
          success: false,
          message: 'User not found',
          statusCode: HttpStatus.NOT_FOUND,
        };
      }
      const user = {
        _id: user_dehive_data._id,
        dehive_role: user_dehive_data.dehive_role,
        role_subscription: user_dehive_data.role_subscription,
        status: user_dehive_data.status,
        server_count: user_dehive_data.server_count,
        username: user_decode_data.username,
        display_name: user_decode_data.display_name,
        bio: user_decode_data.bio,
        avatar_ipfs_hash: user_decode_data.avatar_ipfs_hash,
        last_login: user_decode_data.last_login,
        primary_wallet: user_decode_data.primary_wallet,
        following_number: user_decode_data.following_number,
        followers_number: user_decode_data.followers_number,
        is_following: user_decode_data.is_following,
        is_follower: user_decode_data.is_follower,
        is_blocked: user_decode_data.is_blocked,
        is_blocked_by: user_decode_data.is_blocked_by,
        mutual_followers_number: user_decode_data.mutual_followers_number,
        mutual_followers_list: user_decode_data.mutual_followers_list,
        is_active: user_decode_data.is_active,
        last_account_deactivation: user_decode_data.last_account_deactivation,
      };
      console.log(
        'user service get my decode profile user_decode_data',
        user_decode_data,
      );
      // Store user data in redis with session_id
      const redis_cache_data = (await this.redis.get(
        `session:${session_id}`,
      )) as SessionCacheDoc;
      if (redis_cache_data) {
        redis_cache_data.user =
          user_decode_data as unknown as AuthenticatedUser;
        await this.redis.set(`session:${session_id}`, redis_cache_data);
      }
      return {
        success: true,
        message: 'User found',
        statusCode: HttpStatus.OK,
        data: user as unknown as UserDehiveDoc,
      };
    } catch (error) {
      return {
        success: false,
        message: (error as Error).message,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async userExists(user_id: string): Promise<Response<boolean>> {
    const user_dehive_data = await this.userDehiveModel.findById(user_id);
    if (!user_dehive_data) {
      return {
        success: false,
        message: 'User not found',
        statusCode: HttpStatus.NOT_FOUND,
      };
    }
    return {
      success: true,
      message: 'User exists',
      statusCode: HttpStatus.OK,
      data: user_dehive_data ? true : false,
    };
  }

  private async getUserDecodeProfile(input: {
    user_id: string;
    session_id: string;
    fingerprint_hashed: string;
  }): Promise<Response<UserDecodeDoc>> {
    const { user_id, session_id, fingerprint_hashed } = input;
    try {
      const user_decode = await this.decodeApiClient.getUser(
        user_id,
        session_id,
        fingerprint_hashed,
      );
      if (!user_decode.success) {
        return {
          success: false,
          message: user_decode.message,
          statusCode: user_decode.statusCode,
        };
      }
      return user_decode;
    } catch (error) {
      return {
        success: false,
        message: (error as Error).message,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  private async getMyDecodeProfile(input: {
    session_id: string;
    fingerprint_hashed: string;
  }): Promise<Response<UserDecodeDoc>> {
    const { session_id, fingerprint_hashed } = input;
    try {
      console.log(
        'user service get my decode profile input',
        session_id,
        fingerprint_hashed,
      );
      const user_decode = await this.decodeApiClient.getMyProfile(
        session_id,
        fingerprint_hashed,
      );
      if (!user_decode.success) {
        return {
          success: false,
          message: user_decode.message,
          statusCode: user_decode.statusCode,
        };
      }
      return {
        success: true,
        message: 'User found',
        statusCode: HttpStatus.OK,
        data: user_decode.data,
      };
    } catch (error) {
      return {
        success: false,
        message: (error as Error).message,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }
}
