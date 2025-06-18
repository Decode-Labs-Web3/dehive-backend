import { IsEnum, IsMongoId, IsNotEmpty } from 'class-validator';
import { ServerRole } from '../entities/user-dehive-server.entity';

export class AssignRoleDto {
    @IsMongoId()
    @IsNotEmpty()
    server_id: string;

    @IsMongoId()
    @IsNotEmpty()
    target_user_id: string;

    @IsEnum(ServerRole)
    @IsNotEmpty()
    role: ServerRole;
}