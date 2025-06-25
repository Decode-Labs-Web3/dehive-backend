import { Controller, Get, Post, Headers, Body, Delete, Param } from '@nestjs/common';
import { UserDehiveService } from './user-dehive.service';

@Controller('user-dehive')
export class UserDehiveController {
  constructor(private readonly userDehiveService: UserDehiveService) {}

  @Get()
  getHello(): string {
    return this.userDehiveService.getHello();
  }

  @Post('register')
  async register(@Headers('Authorization') decode_auth_token: string) {
    console.log('user-dehive controller register post', decode_auth_token);
    return await this.userDehiveService.register(decode_auth_token);
  }

  @Post('auth-check-callback')
  async authCheckCallback(@Body() payload: { sso_token: string }) {
    console.log('user-dehive controller authCheckCallback post', payload);
    return await this.userDehiveService.authCheckCallback(payload.sso_token);
  }

  @Post('refresh-session')
  async refreshSession(@Headers('Authorization') refresh_token: string) {
    console.log('user-dehive controller refreshSession post', refresh_token);
    return await this.userDehiveService.refreshSession(refresh_token);
  }

  @Get('profile/me')
  async getMyProfile(@Headers('Authorization') decode_auth_token: string) {
    console.log('user-dehive controller getMyProfile get', decode_auth_token);
    return await this.userDehiveService.getMyProfile(decode_auth_token);
  }

  @Get('profile/user')
  async getUserProfile(
    @Headers('Authorization') decode_auth_token: string,
    @Body('user_id') user_id: string
  ) {
    return await this.userDehiveService.getUserProfile(user_id, decode_auth_token);
  }

  @Post('friends/request')
  async sendFriendRequest(
    @Headers('Authorization') auth: string,
    @Body('to_user_id') to_user_id: string
  ) {
    return await this.userDehiveService.sendFriendRequest(auth, to_user_id);
  }

  @Delete('friends/request')
  async removeFriendRequest(
    @Headers('Authorization') auth: string,
    @Body('to_user_id') to_user_id: string
  ) {
    return await this.userDehiveService.removeFriendRequest(auth, to_user_id);
  }

  @Post('friends/request/accept')
  async acceptFriendRequest(
    @Headers('Authorization') auth: string,
    @Body('requester') requester: string
  ) {
    return await this.userDehiveService.acceptFriendRequest(auth, requester);
  }

  @Delete('friends/request/reject')
  async rejectFriendRequest(
    @Headers('Authorization') auth: string,
    @Body('requester') requester: string
  ) {
    return await this.userDehiveService.rejectFriendRequest(auth, requester);
  }

  @Get('friends/requests/page/:page/:page_size')
  async getFriendRequestsPage(@Headers('Authorization') auth: string, @Param('page') page: number, @Param('page_size') page_size: number) {
    return await this.userDehiveService.getFriendRequestsPage(auth, page, page_size);
  }

  @Get('friends/my-requests/page/:page/:page_size')
  async getMyRequestsPage(@Headers('Authorization') auth: string, @Param('page') page: number, @Param('page_size') page_size: number) {
    return await this.userDehiveService.getMyRequestsPage(auth, page, page_size);
  }

  @Get('friends/page/:page/:page_size')
  async getFriendsPage(
    @Headers('Authorization') auth: string,
    @Param('page') page: number,
    @Param('page_size') page_size: number
  ) {
    return await this.userDehiveService.getFriendsPage(auth, page, page_size);
  }

  @Delete('friends')
  async removeFriend(
    @Headers('Authorization') auth: string,
    @Body('to_user_id') to_user_id: string
  ) {
    return await this.userDehiveService.removeFriend(auth, to_user_id);
  }

  @Post('blocks/block')
  async blockUser(
    @Headers('Authorization') auth: string,
    @Body('to_user_id') to_user_id: string
  ) {
    return await this.userDehiveService.blockUser(auth, to_user_id);
  }

  @Post('blocks/unblock')
  async unblockUser(
    @Headers('Authorization') auth: string,
    @Body('to_user_id') to_user_id: string
  ) {
    return await this.userDehiveService.unblockUser(auth, to_user_id);
  }

  @Get('blocks')
  async getBlockedUsersList(@Headers('Authorization') auth: string) {
    return await this.userDehiveService.getBlockedUsersList(auth);
  }

  @Get('friends/suggestions/:page/:page_size')
  async getFriendsSuggestionsPage(
    @Headers('Authorization') auth: string,
    @Body('page') page: number,
    @Body('page_size') page_size: number
  ) {
    return await this.userDehiveService.getFriendsSuggestionsPage(auth, page, page_size);
  }

  @Get('friends/search')
  async friendSearch(
    @Headers('Authorization') auth: string,
    @Body('query') query: string
  ) {
    return await this.userDehiveService.friendSearch(auth, query);
  }

  @Get('relationship/:to_user_id')
  async checkUserToUserRelationship(
    @Headers('Authorization') auth: string,
    @Body('to_user_id') to_user_id: string
  ) {
    return await this.userDehiveService.checkUserToUserRelationship(auth, to_user_id);
  }

  @Get('friends/mutual/count/:other_user_id')
  async countMutualFriends(
    @Headers('Authorization') auth: string,
    @Body('other_user_id') other_user_id: string
  ) {
    return await this.userDehiveService.countMutualFriends(auth, other_user_id);
  }

  @Get('friends/mutual/:other_user_id/:page/:page_size')
  async getMutualFriendsPage(
    @Headers('Authorization') auth: string,
    @Body('other_user_id') other_user_id: string,
    @Body('page') page: number,
    @Body('page_size') page_size: number
  ) {
    return await this.userDehiveService.getMutualFriendsPage(auth, other_user_id, page, page_size);
  }
}
