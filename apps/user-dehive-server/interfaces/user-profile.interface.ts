export interface UserProfile {
  _id: string;
  username: string;
  display_name: string;
  avatar_ipfs_hash: string;
  bio?: string;
  status?: string;
  banner_color?: string;
  server_count?: number;
  last_login?: Date;
  primary_wallet?: string;
  following_number?: number;
  followers_number?: number;
  is_following?: boolean;
  is_follower?: boolean;
  is_blocked?: boolean;
  is_blocked_by?: boolean;
  mutual_followers_number?: number;
  mutual_followers_list?: string[];
  is_active?: boolean;
  last_account_deactivation?: Date;
  dehive_role?: string;
  role_subscription?: string;
  wallets?: unknown[];
  __v?: number;
}
