import { WalletDoc } from "./wallet-doc.interface";

export interface UserDehiveDoc {
  _id: string;
  dehive_role: string;
  role_subscription: string;
  status: string;
  server_count: number;
  username: string;
  display_name: string;
  bio: string;
  avatar_ipfs_hash: string;
  last_login: Date;
  is_active: boolean;
  last_account_deactivation: Date;
  primary_wallet: WalletDoc;
  following_number?: number;
  followers_number?: number;
  is_following?: boolean;
  is_follower?: boolean;
  is_blocked?: boolean;
  is_blocked_by?: boolean;
  mutual_followers_number?: number;
  mutual_followers_list?: string[];
}

export interface UserDecodeDoc {
  _id: string;
  user_id?: string;
  email: string;
  username: string;
  role: string;
  display_name: string;
  bio: string;
  avatar_ipfs_hash: string;
  last_login: Date;
  last_username_change: Date;
  last_email_change: Date;
  is_active: boolean;
  last_account_deactivation: Date;
  primary_wallet: WalletDoc;
  following_number?: number;
  followers_number?: number;
  is_following?: boolean;
  is_follower?: boolean;
  is_blocked?: boolean;
  is_blocked_by?: boolean;
  mutual_followers_number?: number;
  mutual_followers_list?: string[];
}
