import { Wallet } from "./wallet.interface";

export interface UserProfile {
  user_id: string;
  user_dehive_id: string;
  username: string;
  display_name: string;
  avatar: string | null;
  avatar_ipfs_hash?: string | null;
  bio?: string;
  wallets?: Wallet[];
  created_at?: string;
  updated_at?: string;
}
