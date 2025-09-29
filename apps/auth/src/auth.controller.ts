import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { AuthService } from './auth.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { CreateUserDto } from '../dto/createUser.dto';
import { DeviceFingerprintDto } from '../dto/deviceFingerprint.dto';
import { CreateSessionDto } from '../dto/createSession.dto';
@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @MessagePattern('auth.health')
  checkHealth(): { status: string } {
    return { status: 'ok auth.health' };
  }

  @MessagePattern('auth.register')
  register(dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @MessagePattern('auth.verify')
  verify(token: string) {
    return this.authService.verify(token);
  }

  @MessagePattern('auth.checkLogin')
  checkLogin(dto: { username_or_email: string, password: string }) {
    return this.authService.checkLogin(dto.username_or_email, dto.password);
  }

  @MessagePattern('auth.login')
  login(dto: LoginDto) {
    return this.authService.login(dto);
  }

  @MessagePattern('auth.resendEmailVerification')
  async resendEmailVerification(dto: {
    email: string;
    username: string;
    password_hashed: string;
  }) {
    const userCreateDto: CreateUserDto = {
      email: dto.email,
      username: dto.username,
      password_hashed: dto.password_hashed,
    };
    return this.authService.resendVerification(
      userCreateDto.email,
      userCreateDto.username,
      userCreateDto.password_hashed,
    );
  }

  @MessagePattern('auth.fingerprintCheckOrCreate')
  fingerprintCheckOrCreate(dto: DeviceFingerprintDto) {
    return this.authService.fingerprintCheckOrCreate(dto);
  }

  @MessagePattern('auth.fingerprintTrust')
  fingerprintTrust(token: string) {
    return this.authService.fingerprintTrust(token);
  }

  @MessagePattern('auth.sessionCreate')
  sessionCreate(payload: CreateSessionDto) {
    return this.authService.sessionCreate(
      payload.jwt_token,
      payload.fingerprint_hash,
    );
  }

  @MessagePattern('auth.refreshSession')
  refreshSession(payload: { refreshToken: string }) {
    return this.authService.refreshSession(payload.refreshToken);
  }

  @MessagePattern('auth.authCheck')
  authCheck(payload: { refreshToken: string }) {
    return this.authService.authCheck(payload.refreshToken);
  }

  @MessagePattern('auth.get_refresh_token_by_sso_token')
  get_refresh_token_by_sso_token(payload: { ssoToken: string }) {
    return this.authService.get_refresh_token_by_sso_token(payload.ssoToken);
  }
}
