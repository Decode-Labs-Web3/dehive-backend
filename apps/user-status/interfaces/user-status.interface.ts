export interface UserStatusItem {
  user_id: string;
  status: "online" | "offline";
  conversationid?: string;
  displayname: string;
  username: string;
  avatar_ipfs_hash: string;
  wallets?: Array<{
    _id: string;
    address: string;
    user_id: string;
    name_service: string | null;
    is_primary: boolean;
    createdAt: string;
    updatedAt: string;
    __v: number;
  }>;
  isCall: boolean;
  last_seen: Date;
  lastMessageAt?: Date;
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
