import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

interface ServiceConfig {
  url: string;
  healthEndpoint: string;
  timeout: number;
  retries: number;
}

@Injectable()
export class GatewayService {
  private readonly logger = new Logger(GatewayService.name);

  private readonly services: Record<string, ServiceConfig> = {
    auth: {
      url: 'http://localhost:4006',
      healthEndpoint: '/auth/health',
      timeout: 5000,
      retries: 3
    },
    server: {
      url: 'http://localhost:4002',
      healthEndpoint: '/api/servers/health',
      timeout: 5000,
      retries: 3
    },
    'user-dehive-server': {
      url: 'http://localhost:4001',
      healthEndpoint: '/api/health',
      timeout: 5000,
      retries: 3
    },
    'channel-messaging': {
      url: 'http://localhost:4003',
      healthEndpoint: '/api/health',
      timeout: 5000,
      retries: 3
    },
    'direct-messaging': {
      url: 'http://localhost:4004',
      healthEndpoint: '/api/health',
      timeout: 5000,
      retries: 3
    },
  };

  private serviceStatus: Record<string, boolean> = {};
  private lastHealthCheck: Record<string, number> = {};
  private readonly healthCheckInterval = 30000; // 30 seconds

  constructor(private readonly httpService: HttpService) {}

  async proxyRequest(serviceName: string, path: string, method: string, body?: any, headers?: any) {
    const serviceConfig = this.services[serviceName];

    if (!serviceConfig) {
      throw new HttpException(`Service ${serviceName} not found`, HttpStatus.NOT_FOUND);
    }

    // Check if service is available first (with cache)
    const isServiceAvailable = await this.checkServiceHealth(serviceName);
    if (!isServiceAvailable) {
      throw new HttpException(
        `Service ${serviceName} is unavailable`,
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }

    const fullUrl = `${serviceConfig.url}${path}`;

    this.logger.log(`🔄 Proxying ${method} ${fullUrl}`);
    this.logger.debug(`Headers: ${JSON.stringify(headers)}`);
    this.logger.debug(`Body: ${JSON.stringify(body)}`);

    // Prepare request headers (remove host and other gateway-specific headers)
    const cleanHeaders = this.cleanHeaders(headers);

    // Retry logic with exponential backoff
    let lastError;
    for (let attempt = 1; attempt <= serviceConfig.retries; attempt++) {
      try {
        let response;

        switch (method.toUpperCase()) {
          case 'GET':
            response = await firstValueFrom(
              this.httpService.get(fullUrl, {
                headers: cleanHeaders,
                timeout: serviceConfig.timeout
              })
            );
            break;
          case 'POST':
            response = await firstValueFrom(
              this.httpService.post(fullUrl, body, {
                headers: cleanHeaders,
                timeout: serviceConfig.timeout
              })
            );
            break;
          case 'PUT':
            response = await firstValueFrom(
              this.httpService.put(fullUrl, body, {
                headers: cleanHeaders,
                timeout: serviceConfig.timeout
              })
            );
            break;
          case 'PATCH':
            response = await firstValueFrom(
              this.httpService.patch(fullUrl, body, {
                headers: cleanHeaders,
                timeout: serviceConfig.timeout
              })
            );
            break;
          case 'DELETE':
            response = await firstValueFrom(
              this.httpService.delete(fullUrl, {
                headers: cleanHeaders,
                timeout: serviceConfig.timeout
              })
            );
            break;
          default:
            throw new HttpException(`Method ${method} not supported`, HttpStatus.METHOD_NOT_ALLOWED);
        }

        this.logger.log(`✅ Success response from ${serviceName}: ${response.status}`);
        return {
          data: response.data,
          statusCode: response.status,
          headers: response.headers
        };

      } catch (error) {
        lastError = error;

        // If we get ANY response from service (even 401/404), forward it with correct status
        if (error.response) {
          this.logger.log(`✅ Forwarding response from ${serviceName}: ${error.response.status}`);
          return {
            data: error.response.data,
            statusCode: error.response.status,
            headers: error.response.headers
          };
        }

        // If this is not the last attempt, wait before retrying
        if (attempt < serviceConfig.retries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          this.logger.warn(`⚠️ Attempt ${attempt} failed for ${serviceName}, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
    }

    // All retries failed
    this.logger.error(`❌ Service ${serviceName} failed after ${serviceConfig.retries} attempts:`, lastError.message);
    this.serviceStatus[serviceName] = false;

    throw new HttpException(
      `Service ${serviceName} is unavailable`,
      HttpStatus.SERVICE_UNAVAILABLE
    );
  }

  private async checkServiceHealth(serviceName: string): Promise<boolean> {
    const serviceConfig = this.services[serviceName];

    if (!serviceConfig) {
      return false;
    }

    const now = Date.now();
    const lastCheck = this.lastHealthCheck[serviceName] || 0;

    // If we checked recently and service is up, use cached result
    if (this.serviceStatus[serviceName] === true && (now - lastCheck) < this.healthCheckInterval) {
      this.logger.debug(`Service ${serviceName} is cached as healthy`);
      return true;
    }

    // If we already know the service is down, don't check again for a while
    if (this.serviceStatus[serviceName] === false && (now - lastCheck) < this.healthCheckInterval) {
      this.logger.debug(`Service ${serviceName} is cached as down`);
      return false;
    }

    try {
      const healthUrl = `${serviceConfig.url}${serviceConfig.healthEndpoint}`;

      this.logger.debug(`Checking health for ${serviceName} at ${healthUrl}`);

      const response = await firstValueFrom(
        this.httpService.get(healthUrl, {
          timeout: serviceConfig.timeout
        })
      );

      // If we get any response (even 401/404), service is up
      this.serviceStatus[serviceName] = true;
      this.lastHealthCheck[serviceName] = now;
      this.logger.debug(`✅ Service ${serviceName} is healthy`);
      return true;
    } catch (error) {
      // If it's a 401/404 error, service is up but endpoint requires auth
      if (error.response && (error.response.status === 401 || error.response.status === 404)) {
        this.serviceStatus[serviceName] = true;
        this.lastHealthCheck[serviceName] = now;
        this.logger.debug(`✅ Service ${serviceName} is up (got ${error.response.status})`);
        return true;
      }

      this.logger.warn(`⚠️ Service ${serviceName} health check failed: ${error.message}`);
      this.serviceStatus[serviceName] = false;
      this.lastHealthCheck[serviceName] = now;
      return false;
    }
  }

  getServiceUrl(serviceName: string): string {
    return this.services[serviceName]?.url;
  }

  getAllServices(): Record<string, ServiceConfig> {
    return this.services;
  }

  getServiceStatus(): Record<string, boolean> {
    return this.serviceStatus;
  }

  async refreshServiceStatus(): Promise<void> {
    this.logger.log('🔄 Refreshing service status...');

    const healthChecks = Object.keys(this.services).map(async (serviceName) => {
      const isHealthy = await this.checkServiceHealth(serviceName);
      this.logger.log(`${isHealthy ? '✅' : '❌'} ${serviceName}: ${isHealthy ? 'UP' : 'DOWN'}`);
    });

    await Promise.all(healthChecks);
  }

  private cleanHeaders(headers: any): any {
    if (!headers) return {};

    const cleanHeaders = { ...headers };

    // Remove headers that shouldn't be forwarded to microservices
    const headersToRemove = [
      'host',
      'x-forwarded-for',
      'x-forwarded-proto',
      'x-forwarded-host',
      'x-real-ip',
      'connection',
      'upgrade',
      'proxy-connection',
      'proxy-authenticate',
      'proxy-authorization',
      'te',
      'trailers',
      'transfer-encoding'
    ];

    headersToRemove.forEach(header => {
      delete cleanHeaders[header];
      delete cleanHeaders[header.toLowerCase()];
    });

    return cleanHeaders;
  }
}
