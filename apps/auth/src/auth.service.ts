/**
 * Authentication Service
 *
 * This service handles all authentication-related operations including user registration,
 * login, email verification, and token management.
 *
 * Dependencies:
 * - MongoDB for user storage
 * - Redis for temporary token storage
 * - JWT for authentication tokens
 * - Email microservice for sending verification emails
 */
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { User, UserSchema } from '../schemas/user.schema';
import { DeviceFingerprint, DeviceFingerprintSchema } from '../schemas/device_fingerprint.schema';  
import { Session, SessionSchema } from '../schemas/session.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RegisterDto } from '../dto/register.dto';
import { CreateUserDto } from '../dto/createUser.dto';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import * as jwt from 'jsonwebtoken';
import { Redis } from 'ioredis';
import { JwtService } from '@nestjs/jwt';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { ClientProxy } from '@nestjs/microservices';
import { LoginDto } from '../dto/login.dto';
import { DeviceFingerprintDto } from '../dto/deviceFingerprint.dto';
import { CreateSessionDto } from '../dto/createSession.dto';
import { createHash } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(DeviceFingerprint.name) private fingerprintModel: Model<DeviceFingerprint>,
    @InjectModel(Session.name) private sessionModel: Model<Session>,
    @InjectRedis() private readonly redis: Redis,
    private readonly jwtService: JwtService,
    @Inject('EMAIL_SERVICE') private readonly emailClient: ClientProxy,
  ) {}

  /**
   * Registers a new user in the system
   *
   * @param dto - Registration data transfer object containing username, email, and password
   * @returns Object with statusCode and message indicating successful registration
   * @returns Object with error details if user with the same username or email already exists
   */
  async register(dto: RegisterDto) {
    const { username, email, password } = dto;

    // Check if user already exists with the same username or email
    const existing = await this.userModel.findOne({ $or: [{ username }, { email }] });
    if (existing) {
      return {
        statusCode: 400,
        message: 'User already exists',
        error: 'Bad Request',
      };
    }

    // Hash the password for secure storage
    const hashed = await bcrypt.hash(password, 10);

    const userData = {
      username: username,
      email: email,
      password_hashed: hashed,
    };

    // Generate verification token and store in Redis with 15-minute expiration
    const token = uuidv4();
    const code = token.substring(0, 6);
    await this.redis.set(`register:${code}`, JSON.stringify(userData), 'EX', 60 * 15);

    // Send verification email through email microservice
    await this.emailClient.emit('email.send', {
      to: email,
      subject: '🔐 Verify your email for Decode',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
          <h2>Welcome to Decode! 🚀</h2>
          <p>Thank you for joining our community. We're excited to have you on board!</p>
          <p>To complete your registration and verify your email address, please use the verification code below:</p>
          <div style="text-align: center; margin: 25px 0;">
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 4px; font-size: 24px; letter-spacing: 5px; font-weight: bold;">${code}</div>
          </div>
          <p>Enter this code in the verification page on our website to complete your registration.</p>
          <p>This verification code will expire in 15 minutes for security reasons.</p>
          <p>If you didn't create an account with Decode, please ignore this email.</p>
          <p>Best regards,<br>Decode Labs Team 🔍</p>
        </div>
      `,
    }).toPromise();

    return {
      statusCode: 201,
      message: 'User created successfully',
    };
  }

  async resendVerification(email: string, username: string, password_hashed: string) {
    // Check if the user already exists in the database
    const existing = await this.userModel.findOne({ email: email });
    if (existing) {
      return {
        statusCode: 400,
        message: 'User already exists',
      };
    }

    const userData = {
      username: username,
      email: email,
      password_hashed: password_hashed,
    };

    // Generate verification token and store in Redis with 15-minute expiration
    const token = uuidv4();
    const code = token.substring(0, 6);
    await this.redis.set(`register:${code}`, JSON.stringify(userData), 'EX', 60 * 15);

    // Send verification email through email microservice
    await this.emailClient.emit('email.send', {
      to: email,
      subject: '🔐 Verification Code Resent - Decode',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
          <h2>Verification Code Resent 🔄</h2>
          <p>We received a request to resend your verification code for Decode.</p>
          <p>Please use the verification code below to complete your registration:</p>
          <div style="text-align: center; margin: 25px 0;">
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 4px; font-size: 24px; letter-spacing: 5px; font-weight: bold;">${code}</div>
          </div>
          <p>Enter this code in the verification page on our website to activate your account.</p>
          <p>This verification code will expire in 15 minutes for security reasons.</p>
          <p>If you didn't request this code, please ignore this email or contact our support team.</p>
          <p>Best regards,<br>Decode Labs Team 🔍</p>
        </div>
      `,
    }).toPromise();

    return {
      statusCode: 201,
      message: 'Verification code sent successfully',
    };
  }

  /**
   * Verifies a user's email using the provided token
   *
   * @param token - Verification token from the email link
   * @returns Object with statusCode, message, and JWT token for authentication
   * @returns Object with error details if token is invalid or expired
   * @returns Object with error details if user associated with token doesn't exist
   */
  async verify(token: string) {
    // Extract the code from the token object if it's an object, otherwise use the token directly
    const code = typeof token === 'object' && 'token' in token ? token['token'] : token;
    const cachedUserData = await this.redis.get(`register:${code}`);
    if (cachedUserData === null) {
      return {
        statusCode: 404,
        message: 'Invalid or expired token',
      };
    }

    const userData: CreateUserDto = JSON.parse(cachedUserData);
    
    const user = await this.userModel.create({
      username: userData.username,
      email: userData.email,
      password_hashed: userData.password_hashed,
      email_verified: true,
      biography: 'Hi, I am a new user',
      display_name: userData.username,
      created_at: new Date(),
      updated_at: new Date(),
    });
    
    await this.redis.del(`register:${code}`);

    // Generate authentication token for the verified user
    const authToken = this.jwtService.sign({ id: user._id }, { expiresIn: '1h' });

    return {
      statusCode: 200,
      message: 'Email verified successfully',
      token: authToken,
    };
  }

  async checkLogin(username_or_email: string, password: string) {
    const user = await this.userModel.findOne({ $or: [{ username: username_or_email }, { email: username_or_email }] });
    if (!user) {
      return {
        statusCode: 401,
        message: 'Invalid username or email',
      };
    }

    const password_valid = await bcrypt.compare(password, user.password_hashed);
    if (!password_valid) {
      return {
        statusCode: 401,
        message: 'Invalid password',
      };
    }

    return {
      statusCode: 200,
      message: 'Login successful',
      user: user,
    };
  }

  /**
   * Authenticates a user and provides a JWT token
   *
   * @param dto - Login data transfer object containing username/email and password
   * @returns Object with statusCode, message, and JWT token for authentication
   * @returns Object with error details if credentials are invalid or email is not verified
   */
  async login(dto: LoginDto) {
    const { username_or_email, password } = dto;


    // Find user by username or email
    const user = await this.userModel.findOne({ $or: [{ username: username_or_email }, { email: username_or_email }] });
    if (!user) {
      return {
        statusCode: 401,
        message: 'Invalid username or email',
      };
    }

    // Verify password
    const password_valid = await bcrypt.compare(password, user.password_hashed);
    if (!password_valid) {
      return {
        statusCode: 401,
        message: 'Invalid password',
      };
    }

    // Check if email is verified
    if (!user.email_verified) {
      return {
        statusCode: 403,
        message: 'Email not verified',
      };
    }

    // Generate authentication token
    const authToken = this.jwtService.sign({ id: user._id }, { expiresIn: '1h' });

    return {
      statusCode: 200,
      message: 'Login successful',
      token: authToken,
    };
  }

  async fingerprintCheckOrCreate(dto: DeviceFingerprintDto) {

    const fingerprintDto = dto; // { username_or_email: string, fingerprint_hash: string }

    const user = await this.userModel.findOne({ $or: 
      [{ username: fingerprintDto.username_or_email }, 
      { email: fingerprintDto.username_or_email }] }).exec();
    if (!user) {
      return {
        statusCode: 401,
        message: 'User not found',
      };
    }

    const fingerprintData = {
      username_or_email: user.username,
      fingerprint_hash: fingerprintDto.fingerprint_hash,
    }

    const fingerprintRaw = JSON.stringify(fingerprintData);
    console.log('checkOrCreate fingerprintRaw', fingerprintRaw);

    const fingerprintHash = createHash('sha256').update(fingerprintRaw).digest('hex');

    console.log('checkOrCreate fingerprintHash', fingerprintHash);

    const fingerprint = await this.fingerprintModel.findOne({ user_id: user._id, fingerprint_hash: fingerprintHash }).exec();
    if (fingerprint) {
      if (fingerprint.is_trusted) {
        console.log('Fingerprint found and trusted, login successful');
        return {
          statusCode: 200,
          message: 'Fingerprint found, login successful',
          is_trusted: fingerprint.is_trusted,
          fingerprint: fingerprint,
        };
      }
      else {
        console.log('Fingerprint found, login not trusted');
        const token = uuidv4();
        const code = token.substring(0, 6);
        await this.redis.set(`fingerprint:${code}`, fingerprintHash, 'EX', 60 * 15);

        await this.emailClient.emit('email.send', {
          to: user.email,
          subject: '🔐 A new login was detected on your account',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
              <h2>A new login was detected on your account</h2>
              <p>We noticed a new login attempt on your account. Please verify your code to continue.</p>
              <div style="text-align: center; margin: 25px 0;">
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 4px; font-size: 24px; letter-spacing: 5px; font-weight: bold;">${code}</div>
              </div> 
              <p>Enter this code in the verification page on our website to activate your account.</p>
              <p>This verification code will expire in 15 minutes for security reasons.</p>
              <p>If you didn't request this code, please ignore this email or contact our support team.</p>
              <p>Best regards,<br>Decode Labs Team 🔍</p>
            </div>
          `,
        });

        return {
          statusCode: 403,
          message: 'Unrecognized device or IP. Please verify this device to continue.',
          is_trusted: fingerprint.is_trusted,
          fingerprint: fingerprint,
        };
      }
    }

    const newFingerprint = await this.fingerprintModel.create({
      user_id: user._id,
      fingerprint_hash: fingerprintHash,
      created_at: new Date(),
      is_trusted: false,
    });


    const token = uuidv4();
    const code = token.substring(0, 6);
    const fingerprintRedisData = {
      fingerprintHash: fingerprintHash,
      user_id: user._id,
    }
    await this.redis.set(`fingerprint:${code}`, JSON.stringify(fingerprintRedisData), 'EX', 60 * 15);

    // Send email to user with verification code
    await this.emailClient.emit('email.send', {
      to: user.email,
      subject: '🔐 A new login was detected on your account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
          <h2>A new login was detected on your account</h2>
          <p>We noticed a new login attempt on your account. Please verify your code to continue.</p>
          <div style="text-align: center; margin: 25px 0;">
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 4px; font-size: 24px; letter-spacing: 5px; font-weight: bold;">${code}</div>
          </div> 
          <p>Enter this code in the verification page on our website to activate your account.</p>
          <p>This verification code will expire in 15 minutes for security reasons.</p>
          <p>If you didn't request this code, please ignore this email or contact our support team.</p>
          <p>Best regards,<br>Decode Labs Team 🔍</p>
        </div>
      `,
    });
    return {
      statusCode: 403,
      message: 'Unrecognized device or IP. Please verify this device to continue.',
      fingerprint: newFingerprint,
    };
  }

  async fingerprintTrust(token: string) {

    // Find fingerprint by fingerprint_hash
    const fingerprintHash = await this.redis.get(`fingerprint:${token}`);
    if (!fingerprintHash) {
      return {
        statusCode: 401,
        message: 'Fingerprint not found',
      };
    }
    const fingerprintRedisData = JSON.parse(fingerprintHash);
    await this.fingerprintModel
      .updateMany(
        { fingerprint_hash: fingerprintRedisData.fingerprintHash, user_id: fingerprintRedisData.user_id },
        { $set: { is_trusted: true } },
      )
      .exec();

    await this.redis.del(`fingerprint:${token}`);

    const jwt_token = this.jwtService.sign({ id: fingerprintRedisData.user_id }, { expiresIn: '1h' });

    return {
      statusCode: 200,
      message: 'Fingerprint trusted',
      token: jwt_token,
    };
  }

  async sessionCreate(jwt_token: string, fingerprint_hash: string) {

    const decoded = this.jwtService.verify(jwt_token);
    const user = await this.userModel.findById(decoded.id);
    if (!user) {
      return {
        statusCode: 401,
        message: 'Invalid token',
      };
    }

    const fingerprintData = {
      username_or_email: user.username,
      fingerprint_hash: fingerprint_hash,
    }
    const fingerprintRaw = JSON.stringify(fingerprintData); // { user_id: string, fingerprint_hash: string }
    const fingerprintHash = createHash('sha256').update(fingerprintRaw).digest('hex');

    console.log('sessionCreate fingerprintHash', fingerprintHash);
    const fingerprint = await this.fingerprintModel.findOne({ user_id: user._id, fingerprint_hash: fingerprintHash, is_trusted: true }).exec();
    if (!fingerprint) {
      return {
        statusCode: 401,
        message: 'Fingerprint not found',
      };
    }
    

    const sessionToken = this.jwtService.sign({ id: user._id }, { expiresIn: '30d' });

    const session = await this.sessionModel.create({
      user_id: user._id,
      token: sessionToken,
      device_fingerprint_id: fingerprint._id,
      created_at: new Date(),
      expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // 30 days
    });

    return {
      statusCode: 200,
      message: 'Session created',
      session: session,
    };
  }

  async refreshSession(refreshToken: string) {

    const decoded = this.jwtService.verify(refreshToken);
    const session = await this.sessionModel.findOne({ user_id: decoded.id, token: refreshToken }).exec();
    if (!session) {
      return {
        statusCode: 401,
        message: 'Invalid token',
      };
    }

    if (session.expires_at < new Date()) {
      return {
        statusCode: 401,
        message: 'Session expired',
      };
    }
    
    const accessToken = this.jwtService.sign({ id: session.user_id }, { expiresIn: '1h' });

    return {
      statusCode: 200,
      message: 'Session refreshed',
      accessToken: accessToken,
    };
  }

  async authCheck(refreshToken: string) {
    console.log('authCheck refreshToken', refreshToken);
    let decoded;
    try {
      decoded = this.jwtService.verify(refreshToken);
    } catch (error) {
      return {
        statusCode: 401,
        message: 'Invalid token signature',
      };
    }
    console.log('authCheck decoded', decoded);
    const user = await this.userModel.findById(decoded.id);
    if (!user) {
      return {
        statusCode: 401,
        message: 'Invalid token',
      };
    }
    const session = await this.sessionModel.findOne({ user_id: decoded.id, token: refreshToken }).exec();
    if (!session) {
      return {
        statusCode: 401,
        message: 'Invalid token',
      };
    }

    if (session.expires_at < new Date()) {
      return {
        statusCode: 401,
        message: 'Session expired',
      };
    }

    // store sso token in redis
    const ssoToken = uuidv4();
    const ssoTokenCode = ssoToken.substring(0, 6);
    console.log('ssoTokenCode', ssoTokenCode);
    await this.redis.set(`sso:${ssoTokenCode}`, JSON.stringify({ user_id: user._id, session_id: session._id }), 'EX', 30);

    return {
      statusCode: 200,
      message: 'Session is valid',
      sso_token: ssoTokenCode,
    };
  }

  async get_refresh_token_by_sso_token(ssoToken: string) {
    const ssoTokenData = await this.redis.get(`sso:${ssoToken}`);
    if (!ssoTokenData) {
      return {
        statusCode: 401,
        message: 'Invalid token',
      }
    }
    const ssoTokenDataJson = JSON.parse(ssoTokenData);
    const user_id = ssoTokenDataJson.user_id;
    const user = await this.userModel.findById(user_id);
    if (!user) {
      return {
        statusCode: 401,
        message: 'Invalid token',
      }
    }
    const session = await this.sessionModel.findOne({ _id: ssoTokenDataJson.session_id, user_id: user_id }).exec();
    if (!session) {
      return {
        statusCode: 401,
        message: 'Invalid token',
      }
    }

    return {
      statusCode: 200,
      message: 'Session is valid',
      refresh_token: session.token,
    };
  }
}
