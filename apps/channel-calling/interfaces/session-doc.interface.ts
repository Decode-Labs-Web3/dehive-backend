import { UserProfile } from "./user-profile.interface";

export interface SessionDoc {
  _id: string;
  user_id: string;
  session_id: string;
  session_token: string;
  access_token: string;
  fingerprint_hash: string;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
  expires_at: Date;
  is_active: boolean;
}

export interface SessionCacheDoc {
  session_token: string;
  access_token: string;
  user: UserProfile;
  expires_at: Date;
}
