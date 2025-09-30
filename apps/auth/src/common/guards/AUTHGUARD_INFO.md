# AuthGuard and CurrentUser Usage

This directory contains the `AuthGuard` and `CurrentUser` decorator that can be used by other services to authenticate users through the auth service.

## Setup

### 1. Install Dependencies
Make sure your service has the required dependencies:
```bash
npm install @nestjs/axios axios
```

### 2. Import HttpModule
In your service's module, import the HttpModule:
```typescript
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  // ... other imports
})
export class YourServiceModule {}
```

### 3. Import AuthGuard and CurrentUser
```typescript
import { AuthGuard, Public } from './path/to/auth.guard';
import { CurrentUser } from './path/to/current-user.decorator';
import { AuthenticatedUser } from './path/to/authenticated-user.interface';
```

## Usage Examples

### Basic Authentication
```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard, Public } from './path/to/auth.guard';
import { CurrentUser } from './path/to/current-user.decorator';
import { AuthenticatedUser } from './path/to/authenticated-user.interface';

@Controller('api')
export class YourController {
  
  // Public route (no authentication required)
  @Public()
  @Get('public')
  getPublicData() {
    return { message: 'This is public data' };
  }

  // Protected route (authentication required)
  @UseGuards(AuthGuard)
  @Get('protected')
  getProtectedData(@CurrentUser() user: AuthenticatedUser) {
    return {
      message: 'This is protected data',
      user: {
        userId: user.userId,
        username: user.username,
        role: user.role
      }
    };
  }

  // Get specific user property
  @UseGuards(AuthGuard)
  @Get('user-id')
  getUserId(@CurrentUser('userId') userId: string) {
    return { userId };
  }

  // Get user role
  @UseGuards(AuthGuard)
  @Get('user-role')
  getUserRole(@CurrentUser('role') role: string) {
    return { role };
  }
}
```

### Global Authentication
To apply authentication to all routes by default:
```typescript
import { APP_GUARD } from '@nestjs/core';

@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class YourServiceModule {}
```

## Request Headers

The AuthGuard expects the following header:
- `x-session-id`: The session ID from the auth service

## Response Format

The auth service returns user data in this format:
```typescript
interface AuthenticatedUser {
  userId: string;
  email: string;
  username: string;
  role: 'user' | 'admin' | 'moderator';
}
```

## Error Handling

The AuthGuard will throw `UnauthorizedException` in these cases:
- Missing `x-session-id` header
- Invalid or expired session
- Auth service unavailable
- Any other authentication errors

## Configuration

The AuthGuard is configured to call the auth service at `http://localhost:4006`. To change this, modify the `authServiceUrl` property in the AuthGuard class.
