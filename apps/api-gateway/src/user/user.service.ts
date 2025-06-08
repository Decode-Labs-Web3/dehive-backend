import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
@Injectable()
export class UserService {
  constructor(@Inject('USER_SERVICE') private readonly userClient: ClientProxy) {}

  async getHealth() {
    return this.userClient.send('user.health', {}).toPromise();
  }

  async viewMyProfile(accessToken: string) {
    return this.userClient.send('user.viewMyProfile', { accessToken }).toPromise();
  }

  async viewUserPublicProfile(userId: string, accessToken: string) {
    return this.userClient.send('user.viewUserPublicProfile', { userId, accessToken }).toPromise();
  }

  async checkUsername(username: string, accessToken: string) {
    return this.userClient.send('user.checkUsername', { username, accessToken }).toPromise();
  }

  async editUser(payload: any, accessToken: string) {
    return this.userClient.send('user.editUser', { payload, accessToken }).toPromise();
  }
}