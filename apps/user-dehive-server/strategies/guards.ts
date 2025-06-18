import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserDehiveServer, ServerRole } from '../entities/user-dehive-server.entity';

@Injectable()
export class IsServerOwnerGuard implements CanActivate {
  constructor(
    @InjectModel(UserDehiveServer.name)
    private userDehiveServerModel: Model<UserDehiveServer>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    let user_dehive_id, server_id;

    // Handle URL params
    if (request.params.userDehiveId) {
      user_dehive_id = request.params.userDehiveId;
      server_id = request.body.server_id;
    } 
    // Handle body params
    else {
      user_dehive_id = request.body.user_dehive_id;
      server_id = request.body.server_id;
    }

    if (!user_dehive_id || !server_id) {
      console.log('Missing required parameters');
      return false;
    }

    try {
      console.log('Checking server ownership...');
      const member = await this.userDehiveServerModel.findOne({
        user_id: new Types.ObjectId(user_dehive_id),
        'servers.server_id': new Types.ObjectId(server_id),
        'servers.role': 'owner'
      }).lean();

      if (!member) {
        throw new ForbiddenException('Only the server owner can perform this action');
      }

      return true;
    } catch (error) {
      console.error('Error in IsServerOwnerGuard:', error);
      throw error;
    }
  }
}

@Injectable()
export class IsMemberGuard implements CanActivate {
  constructor(
    @InjectModel(UserDehiveServer.name)
    private userDehiveServerModel: Model<UserDehiveServer>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    let user_dehive_id, server_id;

    // Handle URL params
    if (request.params.userDehiveId) {
      user_dehive_id = request.params.userDehiveId;
      server_id = request.body.server_id;
    } 
    // Handle body params
    else {
      user_dehive_id = request.body.user_dehive_id;
      server_id = request.body.server_id;
    }
    
    // For debugging
    console.log('Guard checking membership:', { user_dehive_id, server_id });

    if (!user_dehive_id || !server_id) {
      console.log('Missing required parameters');
      return false;
    }
    
    try {
      console.log('Checking membership in DB...');
      const membership = await this.userDehiveServerModel.findOne({
        user_dehive_id: new Types.ObjectId(user_dehive_id),
        server_id: new Types.ObjectId(server_id),
        is_banned: false
      }).lean();
      
      console.log('Membership found:', membership);
      return !!membership;
    } catch (error) {
      console.error('Error in IsMemberGuard:', error);
      return false;
    }
  }
}

@Injectable()
export class IsModeratorGuard implements CanActivate {
  constructor(
    @InjectModel(UserDehiveServer.name)
    private userDehiveServerModel: Model<UserDehiveServer>,
  ) {}

  private getContextFromRequest(request: any): { action: string } | null {
    // Lấy action từ path hoặc metadata của request
    const path = request.route?.path || '';
    
    if (path.includes('/audit-log')) return { action: 'view_audit_log' };
    if (path.includes('/manage')) return { action: 'manage_server' };
    if (path.includes('/invites/list')) return { action: 'view_invites' };
    if (path.includes('/kick') || path.includes('/ban')) return { action: 'kick_ban_members' };
    
    return null;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { server_id, moderator_id } = request.body;

    if (!server_id || !moderator_id) {
      console.log('Missing required parameters');
      return false;
    }

    try {
      console.log('Checking moderator permissions...');
      const moderator = await this.userDehiveServerModel.findOne({
        server_id: new Types.ObjectId(server_id),
        user_dehive_id: new Types.ObjectId(moderator_id),
        is_banned: false,
        role: { $in: [ServerRole.OWNER, ServerRole.MODERATOR] }
      }).lean();

      if (!moderator) {
        throw new ForbiddenException('Only owners and moderators can perform this action');
      }

      const actionContext = this.getContextFromRequest(request);
      
      // Chỉ OWNER mới có thể xem audit log và quản lý server
      if (actionContext?.action === 'view_audit_log' || 
          actionContext?.action === 'manage_server' ||
          actionContext?.action === 'view_invites') {
        if (moderator.role !== ServerRole.OWNER) {
          throw new ForbiddenException('Only server owner can perform this action');
        }
      }

      return true;
    } catch (error) {
      console.error('Error in IsModeratorGuard:', error);
      throw error;
    }
  }
}