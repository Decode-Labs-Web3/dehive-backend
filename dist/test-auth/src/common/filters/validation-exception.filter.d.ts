import { ExceptionFilter, ArgumentsHost, BadRequestException } from '@nestjs/common';
export interface ValidationErrorResponse {
    success: false;
    statusCode: number;
    message: string;
    error: {
        type: 'validation';
        details: Array<{
            field: string;
            message: string;
            value?: unknown;
        }>;
    };
    timestamp: string;
    path: string;
}
export declare class ValidationExceptionFilter implements ExceptionFilter {
    private readonly logger;
    catch(exception: BadRequestException, host: ArgumentsHost): void;
}
