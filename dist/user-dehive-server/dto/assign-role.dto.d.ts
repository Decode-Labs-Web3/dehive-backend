import { ServerRole } from '../enum/enum';
export declare class AssignRoleDto {
    server_id: string;
    target_session_id: string;
    role: ServerRole;
}
