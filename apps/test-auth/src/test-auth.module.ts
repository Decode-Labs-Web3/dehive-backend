import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { TestAuthController } from './test-auth.controller';
import { TestAuthService } from './test-auth.service';
import { AuthGuard } from './common/guards/auth.guard';

@Module({
  imports: [
    HttpModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
  ],
  controllers: [TestAuthController],
  providers: [TestAuthService, AuthGuard],
  exports: [AuthGuard],
})
export class TestAuthModule {}
