import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { ConfigModule } from "@nestjs/config";
import { GatewayController } from "./gateway.controller";
import { GatewayService } from "./gateway.service";

@Module({
  imports: [
    // HTTP module for making requests to microservices
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
      headers: {
        "User-Agent": "Dehive-API-Gateway/1.0",
      },
    }),
    // Configuration module for environment variables
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
      cache: true,
    }),
  ],
  controllers: [GatewayController],
  providers: [GatewayService],
  exports: [GatewayService], // Export service for potential use in other modules
})
export class AppModule {}
