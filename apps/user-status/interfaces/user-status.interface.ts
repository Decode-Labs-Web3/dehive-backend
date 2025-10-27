export interface UserStatusResponse {
  user_id: string;
  status: "online" | "offline" | "away";
  last_seen: Date;
  user_profile?: {
    username: string;
    display_name: string;
    avatar_ipfs_hash: string;
  };
}

export interface BulkStatusResponse {
  users: {
    user_id: string;
    status: "online" | "offline" | "away";
    last_seen: Date;
    user_profile?: {
      username: string;
      display_name: string;
      avatar_ipfs_hash: string;
    };
  }[];
}

export interface OnlineUsersResponse {
  online_users: {
    user_id: string;
    user_profile: {
      username: string;
      display_name: string;
      avatar_ipfs_hash: string;
    };
  }[];
}
