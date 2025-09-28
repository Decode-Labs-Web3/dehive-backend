import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { UserDehive } from '../schemas/user-dehive.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
@Injectable()
export class UserDehiveService {
  constructor(
    @InjectModel('UserDehive')
    private readonly userDehiveModel: Model<UserDehive>,
    private readonly jwtService: JwtService,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  async register(decode_auth_token: string) {
    const response = await this.checkDecodeAuthToken(decode_auth_token);
    if (!response || response.statusCode !== 200) {
      return {
        statusCode: 401,
        message: response.message || 'User not authenticated',
      };
    }

    const user_id = response.user_id;

    const user = await this.userDehiveModel.findOne({ user_id: user_id });
    if (user) {
      return {
        statusCode: 400,
        message: 'User already exists',
      };
    }

    const newUser = await this.userDehiveModel.create({
      user_id: user_id,
    });

    if (!newUser) {
      return {
        statusCode: 200,
        message: 'User create failed',
      };
    }

    const user_data = await this.getMyProfile(decode_auth_token);

    // Send email to user
    await axios.post(`${process.env.DECODE_API_URL}/email/send`, {
      to: user_data.email,
      title: 'Welcome to DeHive - Your Web3 Journey Begins Here',
      content: `Dear ${user_data.display_name},

      Welcome to DeHive! We're thrilled to have you join our community of Web3 enthusiasts and innovators.

      Your account has been successfully created and you're now ready to explore all that DeHive has to offer. Whether you're here to trade, invest, or learn more about decentralized finance, we're here to support your journey.

      To get started:
      - Complete your profile
      - Connect your primary wallet
      - Explore our available features and services

      If you have any questions or need assistance, our support team is always here to help.

      Best regards,
      The DeHive Team`,
    });

    return {
      statusCode: 200,
      message: 'User created',
    };
  }

  async checkDecodeAuthToken(decode_auth_token: string) {
    try {
      const apiUrl = process.env.DECODE_API_URL;
      console.log(
        'user-dehive service checkDecodeAuthToken',
        `${apiUrl}/auth/verify-decode-auth-token`,
      );
      console.log(
        'user-dehive service checkDecodeAuthToken',
        decode_auth_token,
      );
      const response = await axios.post(
        `${apiUrl}/auth/verify-decode-auth-token`,
        {},
        {
          headers: {
            Authorization: decode_auth_token,
          },
        },
      );
      return response.data;
    } catch (error) {
      console.log('user-dehive service checkDecodeAuthToken', error);
      return null;
    }
  }

  // Calling /auth/get-refresh-token-by-sso-token from decode api to get refresh token
  async authCheckCallback(sso_token: string) {
    const apiUrl = process.env.DECODE_API_URL;
    const response = await axios.post(
      `${apiUrl}/auth/get-refresh-token-by-sso-token`,
      {
        sso_token: sso_token,
      },
    );
    console.log('user-dehive service authCheckCallback', response.data);
    const call_back_response = response.data;
    if (
      !call_back_response.refresh_token ||
      call_back_response.statusCode !== 200
    ) {
      return {
        statusCode: 401,
        message: 'User not authenticated',
      };
    }
    const dehive_access_token = this.jwtService.sign(
      { refresh_token: call_back_response.refresh_token },
      {
        expiresIn: '1h',
      },
    );
    console.log('user-dehive service authCheckCallback', dehive_access_token);
    return {
      statusCode: 200,
      message: 'User authenticated',
      dehive_access_token: dehive_access_token,
      decode_refresh_token: call_back_response.refresh_token,
    };
  }

  async refreshSession(refresh_token: string) {
    const apiUrl = process.env.DECODE_API_URL;
    const response = await axios.post(
      `${apiUrl}/auth/refresh-session`,
      {},
      {
        headers: {
          Authorization: refresh_token,
        },
      },
    );
    return response.data;
  }

  async getMyProfile(decode_auth_token: string) {
    const apiUrl = process.env.DECODE_API_URL;
    console.log('user-dehive service getMyProfile', decode_auth_token);
    const response = await axios.get(`${apiUrl}/users/me`, {
      headers: {
        Authorization: decode_auth_token,
      },
    });
    return response.data;
  }

  async getUserProfile(user_id: string, decode_auth_token: string) {
    const apiUrl = process.env.DECODE_API_URL;
    const response = await axios.get(`${apiUrl}/users/${user_id}`, {
      headers: {
        Authorization: decode_auth_token,
      },
    });
    return response.data;
  }

  async sendFriendRequest(auth: string, to_user_id: string) {
    const apiUrl = process.env.DECODE_API_URL;
    const response = await axios.post(
      `${apiUrl}/relationship/friends/requests`,
      {
        to_user_id: to_user_id,
      },
      {
        headers: { Authorization: auth },
      },
    );
    return response.data;
  }

  async removeFriendRequest(auth: string, to_user_id: string) {
    const apiUrl = process.env.DECODE_API_URL;
    const response = await axios.delete(
      `${apiUrl}/relationship/friends/requests`,
      {
        headers: { Authorization: auth },
        data: { to_user_id: to_user_id },
      },
    );
    return response.data;
  }

  async acceptFriendRequest(auth: string, requester: string) {
    const apiUrl = process.env.DECODE_API_URL;
    const response = await axios.post(
      `${apiUrl}/relationship/friends/request-accept`,
      {
        requester: requester,
      },
      {
        headers: { Authorization: auth },
      },
    );
    return response.data;
  }

  async rejectFriendRequest(auth: string, requester: string) {
    const apiUrl = process.env.DECODE_API_URL;
    const response = await axios.delete(
      `${apiUrl}/relationship/friends/request-reject`,
      {
        headers: { Authorization: auth },
        data: { requester: requester },
      },
    );
    return response.data;
  }

  async getFriendRequestsPage(auth: string, page: number, page_size: number) {
    const apiUrl = process.env.DECODE_API_URL;
    const response = await axios.get(
      `${apiUrl}/relationship/friends/requests/page/${page}/${page_size}`,
      {
        headers: { Authorization: auth },
      },
    );
    return response.data;
  }

  async getMyRequestsPage(auth: string, page: number, page_size: number) {
    const apiUrl = process.env.DECODE_API_URL;
    const response = await axios.get(
      `${apiUrl}/relationship/friends/my-requests/page/${page}/${page_size}`,
      {
        headers: { Authorization: auth },
      },
    );
    return response.data;
  }

  async getFriendsPage(auth: string, page: number, page_size: number) {
    const apiUrl = process.env.DECODE_API_URL;
    const response = await axios.get(
      `${apiUrl}/relationship/friends/page/${page}/${page_size}`,
      {
        headers: { Authorization: auth },
      },
    );
    return response.data;
  }

  async removeFriend(auth: string, to_user_id: string) {
    const apiUrl = process.env.DECODE_API_URL;
    const response = await axios.delete(`${apiUrl}/relationship/friends`, {
      headers: { Authorization: auth },
      data: { to_user_id: to_user_id },
    });
    return response.data;
  }

  async blockUser(auth: string, to_user_id: string) {
    const apiUrl = process.env.DECODE_API_URL;
    const response = await axios.post(
      `${apiUrl}/relationship/blocks/block`,
      {
        to_user_id: to_user_id,
      },
      {
        headers: { Authorization: auth },
      },
    );
    return response.data;
  }

  async unblockUser(auth: string, to_user_id: string) {
    const apiUrl = process.env.DECODE_API_URL;
    const response = await axios.delete(
      `${apiUrl}/relationship/blocks/unblock`,
      {
        headers: { Authorization: auth },
        data: { to_user_id: to_user_id },
      },
    );
    return response.data;
  }

  async getBlockedUsersList(auth: string) {
    const apiUrl = process.env.DECODE_API_URL;
    const response = await axios.get(`${apiUrl}/relationship/blocks`, {
      headers: { Authorization: auth },
    });
    return response.data;
  }

  async getFriendsSuggestionsPage(
    auth: string,
    page: number,
    page_size: number,
  ) {
    const apiUrl = process.env.DECODE_API_URL;
    const response = await axios.get(
      `${apiUrl}/relationship/friends/suggestions/${page}/${page_size}`,
      {
        headers: { Authorization: auth },
      },
    );
    return response.data;
  }

  async friendSearch(auth: string, query: string) {
    const apiUrl = process.env.DECODE_API_URL;
    const response = await axios.get(`${apiUrl}/relationship/friend-search`, {
      headers: { Authorization: auth },
      data: { query: query },
    });
    return response.data;
  }

  async checkUserToUserRelationship(auth: string, to_user_id: string) {
    const apiUrl = process.env.DECODE_API_URL;
    const response = await axios.get(`${apiUrl}/relationship/${to_user_id}`, {
      headers: { Authorization: auth },
    });
    return response.data;
  }

  async countMutualFriends(auth: string, other_user_id: string) {
    const apiUrl = process.env.DECODE_API_URL;
    const response = await axios.get(
      `${apiUrl}/relationship/friends/mutual/count/${other_user_id}`,
      {
        headers: { Authorization: auth },
      },
    );
    return response.data;
  }

  async getMutualFriendsPage(
    auth: string,
    other_user_id: string,
    page: number,
    page_size: number,
  ) {
    const apiUrl = process.env.DECODE_API_URL;
    const response = await axios.get(
      `${apiUrl}/relationship/friends/mutual/${other_user_id}/${page}/${page_size}`,
      {
        headers: { Authorization: auth },
      },
    );
    return response.data;
  }
}
