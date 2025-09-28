import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class FakeAuthGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const request = context.switchToHttp().getRequest();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const userId = request.headers['x-user-id'];

    if (!userId) {
      return false;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    request.user = {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      id: userId,
    };

    return true;
  }
}
