/**
 * Authentication Controller
 * 
 * This controller handles all authentication-related message patterns for the microservice
 * architecture. It receives messages from the API Gateway and delegates to the AuthService.
 * 
 * Message Patterns:
 * - auth.health: Health check endpoint for the auth service
 * - auth.register: User registration
 * - auth.verify: Email verification
 * - auth.login: User login
 * - auth.resendEmailVerification: Resend verification email
 */
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

  /**
   * Health check endpoint for the auth microservice
   * 
   * @returns Object with status indicating service health
   */
  @MessagePattern('auth.health')
  checkHealth(): { status: string } {
    return { status: 'ok auth.health' };
  }

  /**
   * Handles user registration requests
   * 
   * @param dto - Data transfer object containing registration information
   * @returns Response from AuthService with status and message
   */
  @MessagePattern('auth.register')
  register(dto: RegisterDto) {
    return this.authService.register(dto);
  }

  /**
   * Verifies user email with provided token
   * 
   * @param token - Email verification token from the verification link
   * @returns Response with verification status and JWT token if successful
   */
  @MessagePattern('auth.verify')
  verify(token: string) {
    return this.authService.verify(token);
  }

  @MessagePattern('auth.checkLogin')
  checkLogin(dto: { username_or_email: string, password: string }) {
    return this.authService.checkLogin(dto.username_or_email, dto.password);
  }

  /**
   * Authenticates user login attempts
   * 
   * @param dto - Data transfer object containing login credentials
   * @returns Response with login status and JWT token if successful
   */
  @MessagePattern('auth.login')
  login(dto: LoginDto) {
    return this.authService.login(dto);
  }

  /**
   * Resends email verification link to user
   * 
   * @param dto - Object containing user's email address, username, and password_hashed
   * @returns Response indicating whether email was sent successfully
   */
  @MessagePattern('auth.resendEmailVerification')
  async resendEmailVerification(dto: { email: string, username: string, password_hashed: string }) {
    const userCreateDto: CreateUserDto = {
      email: dto.email,
      username: dto.username,
      password_hashed: dto.password_hashed,
    };
    return this.authService.resendVerification(userCreateDto.email, userCreateDto.username, userCreateDto.password_hashed);
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
    return this.authService.sessionCreate(payload.jwt_token, payload.fingerprint_hash);
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
