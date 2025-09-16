import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserDehiveServer, ServerRole } from '../entities/user-dehive-server.entity';

@Injectable()
export class IsServerOwnerGuard implements CanActivate {
  constructor(
    @InjectModel('UserDehiveServer') 
    private userDehiveServerModel: Model<UserDehiveServer>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { user_dehive_id, server_id } = request.body;

    if (!user_dehive_id || !server_id) {
      return false; 
    }

    try {
      const membership = await this.userDehiveServerModel.findOne({
        user_dehive_id: new Types.ObjectId(user_dehive_id),
        server_id: new Types.ObjectId(server_id),
        role: ServerRole.OWNER 
      }).lean();

      if (!membership) {
        throw new ForbiddenException('Only the server owner can perform this action');
      }

      return true;
    } catch (error) {
      throw error;
    }
  }
}

@Injectable()
export class IsMemberGuard implements CanActivate {
  constructor(
    @InjectModel('UserDehiveServer')
    private userDehiveServerModel: Model<UserDehiveServer>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { user_dehive_id, server_id } = request.body;

    if (!user_dehive_id || !server_id) {
      return false;
    }
    
    try {
      const membership = await this.userDehiveServerModel.findOne({
        user_dehive_id: new Types.ObjectId(user_dehive_id),
        server_id: new Types.ObjectId(server_id),
        is_banned: false
      }).lean();
      
      return !!membership;
    } catch (error) {
      return false; 
    }
  }
}

@Injectable()
export class IsModeratorGuard implements CanActivate {
  constructor(
    @InjectModel('UserDehiveServer')
    private userDehiveServerModel: Model<UserDehiveServer>,
  ) {}
  
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const { server_id, moderator_id } = request.body;

    if (!server_id || !moderator_id) {
      return false;
    }

    try {
      const moderator = await this.userDehiveServerModel.findOne({
        server_id: new Types.ObjectId(server_id),
        user_dehive_id: new Types.ObjectId(moderator_id),
        is_banned: false,
        role: { $in: [ServerRole.OWNER, ServerRole.MODERATOR] }
      }).lean();

      if (!moderator) {
        throw new ForbiddenException('Only owners and moderators can perform this action');
      }

      return true;
    } catch (error) {
      throw error;
    }
  }
}