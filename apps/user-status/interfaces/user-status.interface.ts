export interface UserStatusItem {
  user_id: string;
  status: "online" | "offline" | "away";
  conversationid?: string;
  displayname: string;
  username: string;
  avatar_ipfs_hash: string;
  isCall: boolean;
  last_seen: Date;
}

export interface BulkStatusResponse {
  users: UserStatusItem[];
  metadata?: {
    page: number;
    limit: number;
    total: number;
    is_last_page: boolean;
  };
}

export interface OnlineUsersResponse {
  users: UserStatusItem[];
  metadata?: {
    page: number;
    limit: number;
    total: number;
    is_last_page: boolean;
  };
}
