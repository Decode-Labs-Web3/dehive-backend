import { Types } from "mongoose";

export interface SearchResultItem {
  _id: Types.ObjectId;
  content: string;
  channelId: Types.ObjectId;
  senderId?: Types.ObjectId;
  sender?: {
    dehive_id: string;
    username: string;
    display_name: string;
    avatar_ipfs_hash: string | null;
  };
  attachments: unknown[];
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: Date;
  score: number;
}

export interface SearchResultResponse {
  items: SearchResultItem[];
  metadata: {
    page: number;
    limit: number;
    total: number;
    is_last_page: boolean;
  };
}
