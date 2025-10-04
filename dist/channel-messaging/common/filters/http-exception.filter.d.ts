import { ExceptionFilter, ArgumentsHost } from '@nestjs/common';
export interface ErrorResponse {
    success: false;
    statusCode: number;
    message: string;
    error?: string | Record<string, unknown>;
    timestamp: string;
    path: string;
}
export declare class HttpExceptionFilter implements ExceptionFilter {
    private readonly logger;
    catch(exception: unknown, host: ArgumentsHost): void;
}
