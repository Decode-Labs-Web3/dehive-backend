import { Wallet } from "./wallet.interface";

export interface FollowingMessageUser {
  id: string; // user id
  conversationid: string; // conversation id between 2 users
  displayname: string;
  username: string;
  avatar_ipfs_hash?: string; // avatar ipfs hash
  wallets?: Wallet[]; // wallets array
  status: "online" | "offline";
  isCall: boolean;
  lastMessageAt?: Date; // timestamp of last message for sorting - included in response
}

export interface FollowingMessagesResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: {
    items: FollowingMessageUser[];
    metadata: {
      page: number;
      limit: number;
      total: number;
      is_last_page: boolean;
    };
  };
}
