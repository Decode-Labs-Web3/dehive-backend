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
    page: number; // Trang hiện tại (0-indexed)
    limit: number; // Số item mỗi trang
    total: number; // Tổng số kết quả tìm được
    totalPages: number; // Tổng số trang
    hasNextPage: boolean; // Còn trang tiếp theo không
    hasPrevPage: boolean; // Có trang trước không
  };
}
