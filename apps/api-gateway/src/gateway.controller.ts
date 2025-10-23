import {
  Controller,
  All,
  Get,
  Req,
  Res,
  HttpStatus,
  HttpException,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";
import { GatewayService } from "./gateway.service";

@Controller()
export class GatewayController {
  private readonly logger = new Logger(GatewayController.name);

  constructor(private readonly gatewayService: GatewayService) {}

  @Get("health")
  async getHealth(@Res() res: Response) {
    try {
      const serviceStatus = this.gatewayService.getServiceStatus();
      const allServices = this.gatewayService.getAllServices();

      const healthStatus = {
        status: "ok",
        timestamp: new Date().toISOString(),
        services: Object.keys(allServices).map((serviceName) => ({
          name: serviceName,
          url: allServices[serviceName].url,
          status: serviceStatus[serviceName] ? "up" : "down",
          lastChecked: new Date().toISOString(),
        })),
      };

      const allServicesUp = Object.values(serviceStatus).every(
        (status) => status === true,
      );
      const httpStatus = allServicesUp
        ? HttpStatus.OK
        : HttpStatus.SERVICE_UNAVAILABLE;

      res.status(httpStatus).json(healthStatus);
    } catch (error) {
      this.logger.error("Health check failed:", error.message);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: "error",
        message: "Health check failed",
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Get("services")
  async getServices(@Res() res: Response) {
    try {
      const services = this.gatewayService.getAllServices();
      const serviceStatus = this.gatewayService.getServiceStatus();

      const serviceInfo = Object.keys(services).map((serviceName) => ({
        name: serviceName,
        url: services[serviceName].url,
        healthEndpoint: services[serviceName].healthEndpoint,
        timeout: services[serviceName].timeout,
        retries: services[serviceName].retries,
        status: serviceStatus[serviceName] ? "up" : "down",
      }));

      res.json({
        services: serviceInfo,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error("Failed to get services info:", error.message);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: "Failed to get services info",
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Get("refresh")
  async refreshServices(@Res() res: Response) {
    try {
      await this.gatewayService.refreshServiceStatus();
      const serviceStatus = this.gatewayService.getServiceStatus();

      res.json({
        message: "Service status refreshed",
        services: serviceStatus,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error("Failed to refresh service status:", error.message);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: "Failed to refresh service status",
        timestamp: new Date().toISOString(),
      });
    }
  }

  @All("*")
  async handleAllRequests(@Req() req: Request, @Res() res: Response) {
    const startTime = Date.now();
    const { method, url, headers, body, ip } = req;

    // Log request details
    this.logger.log(`📥 ${method} ${url} from ${ip}`);

    try {
      // Extract service name from URL path
      const pathParts = url.split("/").filter((part) => part);
      const serviceName = this.determineService(pathParts, method, url);

      if (!serviceName) {
        this.logger.warn(`❌ No service found for ${method} ${url}`);
        throw new HttpException("Service not found", HttpStatus.NOT_FOUND);
      }

      // Remove service prefix from path
      const servicePath = this.getServicePath(pathParts, serviceName);

      this.logger.log(
        `🔄 Routing ${method} ${url} → ${serviceName}${servicePath}`,
      );

      const result = await this.gatewayService.proxyRequest(
        serviceName,
        servicePath,
        method,
        body,
        headers,
      );

      const duration = Date.now() - startTime;
      this.logger.log(
        `✅ ${method} ${url} → ${serviceName} (${result.statusCode}) - ${duration}ms`,
      );

      // Forward response headers if available
      if (result.headers) {
        Object.keys(result.headers).forEach((key) => {
          if (key.toLowerCase() !== "content-length") {
            res.setHeader(key, result.headers[key]);
          }
        });
      }

      // Forward response with correct status code from service
      res.status(result.statusCode).json(result.data);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `❌ Gateway error for ${method} ${url} (${duration}ms):`,
        error.message,
      );

      if (error instanceof HttpException) {
        res.status(error.getStatus()).json({
          message: error.message,
          statusCode: error.getStatus(),
          timestamp: new Date().toISOString(),
          path: url,
        });
      } else {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          message: "Internal server error",
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          timestamp: new Date().toISOString(),
          path: url,
        });
      }
    }
  }

  private determineService(
    pathParts: string[],
    method: string,
    url: string,
  ): string | null {
    this.logger.debug(`🔍 Determining service for URL: ${url}`);
    this.logger.debug(`🔍 Path parts: ${JSON.stringify(pathParts)}`);

    // Define service routing rules with priority order
    const routingRules = [
      // Auth service routes - highest priority
      {
        service: "auth",
        patterns: ["auth", "login", "register", "logout", "refresh"],
        description: "Authentication service",
      },
      // User-Dehive-Server routes (memberships, profiles, etc.)
      {
        service: "user-dehive-server",
        patterns: ["memberships", "profiles", "invites", "users"],
        description: "User management service",
      },
      // Server management routes
      {
        service: "server",
        patterns: ["servers", "categories"],
        description: "Server management service",
      },
      // Channel messaging routes
      {
        service: "channel-messaging",
        patterns: ["channels", "messages", "uploads"],
        description: "Channel messaging service",
      },
      // Direct messaging routes
      {
        service: "direct-messaging",
        patterns: ["direct", "conversations", "dm"],
        description: "Direct messaging service",
      },
    ];

    // Check each routing rule
    for (const rule of routingRules) {
      for (const pattern of rule.patterns) {
        if (pathParts[0] === pattern || url.includes(`/${pattern}/`)) {
          this.logger.debug(
            `🔍 Routing to ${rule.service} (${rule.description})`,
          );
          return rule.service;
        }
      }
    }

    this.logger.warn(`❌ No service found for URL: ${url}`);
    return null;
  }

  private getServicePath(pathParts: string[], serviceName: string): string {
    // Build original path
    let servicePath = "/" + pathParts.join("/");

    this.logger.debug(`🔍 Original path: ${servicePath}`);
    this.logger.debug(`🔍 Service: ${serviceName}`);

    // Define path transformation rules for each service
    const pathTransformations = {
      auth: {
        // Keep /auth prefix for auth service
        transform: (path: string) => path,
      },
      server: {
        // Transform /servers to /api/servers, /categories to /api/categories
        transform: (path: string) => {
          if (path.startsWith("/servers")) {
            return path.replace("/servers", "/api/servers");
          } else if (path.startsWith("/categories")) {
            return path.replace("/categories", "/api/categories");
          }
          return path;
        },
      },
      "user-dehive-server": {
        // Transform various prefixes to appropriate API endpoints
        transform: (path: string) => {
          if (path.startsWith("/memberships")) {
            return path.replace("/memberships", "/api/memberships");
          } else if (path.startsWith("/profiles")) {
            return path.replace("/profiles", "/api/memberships/profile");
          } else if (path.startsWith("/invites")) {
            return path.replace("/invites", "/api/memberships/invite");
          } else if (path.startsWith("/users")) {
            return path.replace("/users", "/api/users");
          }
          return path;
        },
      },
      "channel-messaging": {
        // Transform to /api/channels, /api/messages, or /api/uploads
        transform: (path: string) => {
          if (path.startsWith("/channels")) {
            return path.replace("/channels", "/api/channels");
          } else if (path.startsWith("/messages")) {
            return path.replace("/messages", "/api/messages");
          } else if (path.startsWith("/uploads")) {
            return path.replace("/uploads", "/api/uploads");
          }
          return path;
        },
      },
      "direct-messaging": {
        // Transform to /api/direct, /api/conversations, or /api/dm
        transform: (path: string) => {
          if (path.startsWith("/direct")) {
            return path.replace("/direct", "/api/direct");
          } else if (path.startsWith("/conversations")) {
            return path.replace("/conversations", "/api/conversations");
          } else if (path.startsWith("/dm")) {
            return path.replace("/dm", "/api/dm");
          }
          return path;
        },
      },
    };

    // Apply transformation
    const transformation = pathTransformations[serviceName];
    if (transformation) {
      servicePath = transformation.transform(servicePath);
    }

    this.logger.debug(`🔍 Final service path: ${servicePath}`);
    return servicePath;
  }
}
