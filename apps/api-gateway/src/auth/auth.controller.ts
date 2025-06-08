import { Controller, Get, Post, Body, Headers } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('health')
  async getAuthHealth() {
    return this.authService.getAuthHealth();
  }

  @Post('register')
  async register(@Body() payload: any) {
    console.log('CONTROLLER DEBUG register payload', payload);
    return this.authService.register(payload);
  }

  @Post('login')
  async login(@Body() payload: any) {    
    console.log('CONTROLLER DEBUG login payload', payload);
    return this.authService.login(payload);
  }

  @Post('resend-email-verification')
  async resendEmailVerification(@Body() payload: any) {
    console.log('CONTROLLER DEBUG resendEmailVerification payload', payload);
    return this.authService.resendEmailVerification(payload);
  }

  @Post('verify-email')
  async verifyEmail(@Body() payload: any) {
    try {
      console.log('CONTROLLER DEBUG verifyEmail payload', payload);
      return this.authService.verifyEmail(payload);
    } catch (error) {
      console.error('Error verifying email:', error);
      throw new Error('Failed to verify email');
    }
  }

  @Post('fingerprint-check-or-create')
  async fingerprintCheckOrCreate(@Body() payload: any) {
    console.log('CONTROLLER DEBUG fingerprintCheckOrCreate payload', payload);
    return this.authService.fingerprintCheckOrCreate(payload);
  }

  @Post('fingerprint-trust')
  async fingerprintTrust(@Body() payload: any) {
    console.log('CONTROLLER DEBUG fingerprintTrust payload', payload);
    return this.authService.fingerprintTrust(payload.token);
  }

  @Post('session-create')
  async sessionCreate(@Body() payload: any) {
    console.log('CONTROLLER DEBUG sessionCreate payload', payload);
    return this.authService.sessionCreate(payload);
  }

  @Post('refresh-session')
  async refreshSession(@Headers('Authorization') auth: string) {
    console.log('CONTROLLER DEBUG refreshSession auth', auth);
    if (!auth || !auth.startsWith('Bearer ')) {
      throw new Error('Invalid authorization header');
    }
    const refreshToken = auth.split(' ')[1];
    return this.authService.refreshSession(refreshToken);
  }

  @Post('auth-check')
  async authCheck(@Body() refreshToken: string ) {
    console.log('CONTROLLER DEBUG authCheck refreshToken', refreshToken);
    return this.authService.authCheck(refreshToken);
  }

  @Post('get-refresh-token-by-sso-token')
  async getRefreshTokenBySsoToken(@Body() payload: any) {
    console.log('CONTROLLER DEBUG getRefreshTokenBySsoToken payload', payload);
    return this.authService.get_refresh_token_by_sso_token(payload.ssoToken);
  }
}