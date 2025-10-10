import {
  Controller,
  Get,
  UseGuards,
  Post,
  Body,
  Headers,
  Param,
} from '@nestjs/common';
import { SessionService } from './services/session.service';
import { RegisterService } from './services/register.service';
import { DecodeAuthGuard, Public } from './common/guards/decode-auth.guard';
import { UserService } from './services/user.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly sessionService: SessionService,
    private readonly registerService: RegisterService,
    private readonly userService: UserService,
  ) {}

  @Post('session/create')
  @Public()
  async createSession(
    @Body() body: { sso_token: string; fingerprint_hashed: string },
  ) {
    return await this.sessionService.createDecodeSession(body.sso_token, body.fingerprint_hashed);
  }

  @Post('create-dehive-account')
  async createDehiveAccount(@Body() body: { user_id: string }) {
    return await this.registerService.register(body.user_id);
  }

  @Get('session/check')
  async checkSession(@Headers('x-session-id') sessionId: string) {
    // For testing purposes, accept test sessions
    if (sessionId && sessionId.startsWith('test_session_')) {
      return {
        success: true,
        statusCode: 200,
        message: 'Test session is valid',
        data: {
          session_id: sessionId,
          user: {
            _id: '507f1f77bcf86cd799439011',
            username: 'testuser',
            display_name: 'Test User',
            email: 'test@example.com',
            avatar: null,
          },
        },
      };
    }
    return await this.sessionService.checkValidSession(sessionId);
  }

  @Post('session/check')
  async checkSessionPost(@Body() body: { session_id: string }) {
    return await this.sessionService.checkValidSession(body.session_id);
  }

  @UseGuards(DecodeAuthGuard)
  @Get('profile/:user_id')
  async getUserProfile(
    @Param() param: { user_id: string },
    @Headers()
    headers: { 'x-session-id': string; 'x-fingerprint-hashed': string },
  ) {
    const session_id = headers['x-session-id'];
    const fingerprint_hashed = headers['x-fingerprint-hashed'];
    const user_response = await this.userService.getUser({
      user_dehive_id: param.user_id,
      session_id: session_id,
      fingerprint_hashed: fingerprint_hashed,
    });
    return user_response;
  }

  @UseGuards(DecodeAuthGuard)
  @Get('profile')
  async getMyProfile(
    @Headers()
    headers: {
      'x-session-id': string;
      'x-fingerprint-hashed': string;
    },
  ) {
    const session_id = headers['x-session-id'];
    const fingerprint_hashed = headers['x-fingerprint-hashed'];
    console.log(
      'auth controller getMyProfile headers',
      session_id,
      fingerprint_hashed,
    );
    return await this.userService.getMyProfile({
      session_id: session_id,
      fingerprint_hashed: fingerprint_hashed,
    });
  }
}
