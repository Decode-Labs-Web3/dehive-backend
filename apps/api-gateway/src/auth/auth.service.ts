import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
@Injectable()
export class AuthService {
  constructor(@Inject('AUTH_SERVICE') private readonly authClient: ClientProxy) {}

  async getAuthHealth() {
    return this.authClient.send('auth.health', {}).toPromise();
  }

  async register(payload: any) {
    return this.authClient.send('auth.register', payload).toPromise();
  }

  async login(payload: any) {
    const fingerprint_payload = {
      username_or_email: payload.username_or_email,
      fingerprint_hash: payload.fingerprint_hash,
    }
    const login_payload = {
      username_or_email: payload.username_or_email,
      password: payload.password,
    }

    const checkLogin = await this.authClient.send('auth.checkLogin', login_payload).toPromise();
    if (checkLogin.statusCode !== 200) {
      return {
        statusCode: 401,
        message: 'Invalid username/email or password',
      }
    }

    const fingerprint_check = await this.authClient.send('auth.fingerprintCheckOrCreate', fingerprint_payload).toPromise();
    if (fingerprint_check.is_trusted) {
      const login_response = await this.authClient.send('auth.login', login_payload).toPromise();
      const session_create_payload = {
        jwt_token: login_response.token,
        fingerprint_hash: payload.fingerprint_hash,
      }
      const session_create_response = await this.authClient.send('auth.sessionCreate', session_create_payload).toPromise();
      console.log('access token', login_response.token);
      return {
        statusCode: 200,
        message: 'Login successful',
        token: login_response.token,
        refresh_token: session_create_response.session.token,
      };
    }
    else {
      return fingerprint_check;
    }
  }

  async resendEmailVerification(payload: any) {
    return this.authClient.send('auth.resendEmailVerification', payload).toPromise();
  }

  async verifyEmail(payload: { token: string }) {
    return this.authClient.send('auth.verify', payload).toPromise();
  }

  async fingerprintCheckOrCreate(payload: any) {
    return this.authClient.send('auth.fingerprintCheckOrCreate', payload).toPromise();
  }

  async fingerprintTrust(payload: { token: string }) {
    return this.authClient.send('auth.fingerprintTrust', payload).toPromise();
  }

  async sessionCreate(payload: { token: string, fingerprint_hash: string }) {
    return this.authClient.send('auth.sessionCreate', payload).toPromise();
  }

  async refreshSession(refreshToken: string) {
    const payload = { refreshToken: refreshToken };
    return this.authClient.send('auth.refreshSession', payload).toPromise();
  }

  async authCheck(refreshToken: string) {
    return this.authClient.send('auth.authCheck', refreshToken).toPromise();
  }

  async get_refresh_token_by_sso_token(ssoToken: string) {
    const payload = { ssoToken: ssoToken };
    return this.authClient.send('auth.get_refresh_token_by_sso_token', payload).toPromise();
  }
}
