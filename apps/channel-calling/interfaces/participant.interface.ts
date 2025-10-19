export interface Participant {
  _id: string;
  username: string;
  display_name: string;
  avatar_ipfs_hash: string;
  bio?: string;
  status?: string;
  is_active?: boolean;
}
