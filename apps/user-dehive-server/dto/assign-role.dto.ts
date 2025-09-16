import { IsEnum, IsMongoId, IsNotEmpty } from 'class-validator';
import { ServerRole } from '../schemas/user-dehive-server.schema';
export class AssignRoleDto {
  @IsNotEmpty() @IsMongoId() server_id: string;
  @IsNotEmpty() @IsMongoId() target_user_id: string; 
  @IsNotEmpty() @IsEnum(ServerRole) role: ServerRole;
}