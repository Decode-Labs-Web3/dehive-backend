import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';

// TODO: Thực hiện kiểm tra thực tế với DB
@Injectable()
export class IsServerOwnerGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Lấy userId từ request, lấy serverId từ body/param, kiểm tra DB
    // Nếu không phải owner thì throw ForbiddenException
    return true;
  }
}

@Injectable()
export class IsMemberGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Lấy userId từ request, lấy serverId từ body/param, kiểm tra DB
    // Nếu không phải member thì throw ForbiddenException
    return true;
  }
}