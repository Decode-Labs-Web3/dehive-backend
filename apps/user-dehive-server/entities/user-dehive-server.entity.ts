import { ServerRole } from '../enum/enum';

export class UserDehiveServer {
  _id: string;
  user_dehive_id: string;
  server_id: string;
  role: ServerRole;
  is_banned: boolean;
  is_muted: boolean;
  joined_at: Date;
  assigned_role_at?: Date;
}
