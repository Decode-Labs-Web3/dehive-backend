import { Injectable } from '@nestjs/common';
import axios from 'axios';
@Injectable()
export class UserDehiveService {
  getHello(): string {
    return 'Hello World!';
  }

  async register(decode_auth_token: string, body: any) {
    const response = await this.checkDecodeAuthToken(decode_auth_token);
    if (response.statusCode === 200) {
      return {
        statusCode: 200,
        message: 'User authenticated',
      };
    } else {
      return {
        statusCode: 401,
        message: 'User not authenticated',
      };
    }
  }

  async checkDecodeAuthToken(decode_auth_token: string) {
    try {
      const apiUrl = process.env.DECODE_API_URL;
      console.log('user-dehive service checkDecodeAuthToken', `${apiUrl}/auth/check-decode-user-auth`);
      console.log('user-dehive service checkDecodeAuthToken', decode_auth_token);
      const response = await axios.post(`${apiUrl}/auth/check-decode-user-auth`, {}, {
        headers: {
          Authorization: decode_auth_token,
        },
      });
      return response.data;
    } catch (error) {
      console.log('user-dehive service checkDecodeAuthToken', error);
      return null;
    }
  }
}
