import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserDehiveServer } from '../entities/user-dehive-server.entity';
import { ServerRole } from '../enum/enum';

interface RequestWithBody {
  body: {
    user_dehive_id?: string;
    server_id?: string;
    moderator_id?: string;
  };
}

function getRequestBody(context: ExecutionContext): RequestWithBody['body'] {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const request = context.switchToHttp().getRequest();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
  return request.body;
}

@Injectable()
export class IsServerOwnerGuard implements CanActivate {
  constructor(
    @InjectModel('UserDehiveServer')
    private userDehiveServerModel: Model<UserDehiveServer>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { user_dehive_id, server_id } = getRequestBody(context);

    if (!user_dehive_id || !server_id) {
      return false;
    }

    const membership = await this.userDehiveServerModel
      .findOne({
        user_dehive_id: new Types.ObjectId(user_dehive_id),
        server_id: new Types.ObjectId(server_id),
        role: ServerRole.OWNER,
      })
      .lean();

    if (!membership) {
      throw new ForbiddenException(
        'Only the server owner can perform this action',
      );
    }

    return true;
  }
}

@Injectable()
export class IsMemberGuard implements CanActivate {
  constructor(
    @InjectModel('UserDehiveServer')
    private userDehiveServerModel: Model<UserDehiveServer>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { user_dehive_id, server_id } = getRequestBody(context);

    if (!user_dehive_id || !server_id) {
      return false;
    }

    const membership = await this.userDehiveServerModel
      .findOne({
        user_dehive_id: new Types.ObjectId(user_dehive_id),
        server_id: new Types.ObjectId(server_id),
        is_banned: false,
      })
      .lean();

    return !!membership;
  }
}

@Injectable()
export class IsModeratorGuard implements CanActivate {
  constructor(
    @InjectModel('UserDehiveServer')
    private userDehiveServerModel: Model<UserDehiveServer>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { server_id, moderator_id } = getRequestBody(context);

    if (!server_id || !moderator_id) {
      return false;
    }

    const moderator = await this.userDehiveServerModel
      .findOne({
        server_id: new Types.ObjectId(server_id),
        user_dehive_id: new Types.ObjectId(moderator_id),
        is_banned: false,
        role: { $in: [ServerRole.OWNER, ServerRole.MODERATOR] },
      })
      .lean();

    if (!moderator) {
      throw new ForbiddenException(
        'Only owners and moderators can perform this action',
      );
    }

    return true;
  }
}
