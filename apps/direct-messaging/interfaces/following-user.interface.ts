export interface FollowingUser {
  email?: string;
  _id?: string;
  user_id: string; // Primary user ID from Decode API
  username: string;
  display_name: string;
  avatar_ipfs_hash?: string;
  bio?: string;
  is_verified?: boolean;
  followers_count?: number;
  following_count?: number;
}

export interface FollowingMeta {
  total: number;
  page: number;
  limit: number;
  is_last_page: boolean;
}

export interface FollowingResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: {
    users: FollowingUser[];
    meta: FollowingMeta;
  };
}
