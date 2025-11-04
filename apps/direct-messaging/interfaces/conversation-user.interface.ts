import { Wallet } from "./wallet.interface";

export interface ConversationUser {
  id: string; // user id
  displayname: string;
  username: string;
  avatar_ipfs_hash?: string; // avatar ipfs hash
  wallets?: Wallet[]; // wallets array
  status: "online" | "offline"; // user online status
}

export interface ConversationUsersResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: {
    user: ConversationUser;
    conversationId: string;
  };
}
