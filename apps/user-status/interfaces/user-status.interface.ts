export interface BulkStatusResponse {
  users: {
    user_id: string;
    conversation_id: string | null; // Conversation ID from direct-messaging service
    isCall: boolean; // Whether this conversation is a call
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
    conversation_id: string | null; // Conversation ID from direct-messaging service
    isCall: boolean; // Whether this conversation is a call
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
