import { AuthenticatedUser } from '../../interfaces/authenticated-user.interface';
export declare const CurrentUser: (...dataOrPipes: (import("@nestjs/common").PipeTransform<any, any> | import("@nestjs/common").Type<import("@nestjs/common").PipeTransform<any, any>> | keyof AuthenticatedUser | "sessionId" | undefined)[]) => ParameterDecorator;
