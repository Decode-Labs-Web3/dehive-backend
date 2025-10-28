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
  metadata?: {
    page: number;
    limit: number;
    total: number;
    is_last_page: boolean;
  };
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
  metadata?: {
    page: number;
    limit: number;
    total: number;
    is_last_page: boolean;
  };
}
