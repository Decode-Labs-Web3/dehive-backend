import { UserProfile } from "./user-profile.interface";

export interface BannedUser {
  _id: string;
  server_id: string;
  user_dehive_id: string;
  banned_by: string;
  reason?: string;
  expires_at?: Date;
  createdAt: Date;
  updatedAt: Date;
  is_banned: true;
  user_profile?: UserProfile;
}

export interface BanListResponse {
  server_id: string;
  total_banned: number;
  banned_users: BannedUser[];
}
