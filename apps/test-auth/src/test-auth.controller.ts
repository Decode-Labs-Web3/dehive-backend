import {
  Controller,
  Get,
  Post,
  UseGuards,
  HttpCode,
  HttpStatus,
  Body,
  Param,
} from '@nestjs/common';
import { TestAuthService } from './test-auth.service';
import { AuthGuard, Public } from './common/guards/auth.guard';
import { CurrentUser } from './common/decorators/current-user.decorator';
import { AuthenticatedUser } from './interfaces/authenticated-user.interface';

@Controller('test-auth')
export class TestAuthController {
  constructor(private readonly testAuthService: TestAuthService) {}

  // Public endpoint - no authentication required
  @Get('public')
  @Public()
  getPublicMessage(): { message: string; timestamp: string } {
    return {
      message: 'This is a public endpoint - no authentication required',
      timestamp: new Date().toISOString(),
    };
  }

  // Basic AuthGuard test
  @Get('protected')
  @UseGuards(AuthGuard)
  getProtectedMessage(@CurrentUser() user: AuthenticatedUser): {
    message: string;
    user: AuthenticatedUser;
    timestamp: string;
  } {
    return {
      message: 'This endpoint is protected by AuthGuard',
      user,
      timestamp: new Date().toISOString(),
    };
  }
}
