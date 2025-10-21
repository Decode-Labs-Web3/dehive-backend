import { FollowingMessageUser } from "./following-message.interface";

export interface FollowingMessageUpdateEvent {
  type: "following_message_update";
  data: {
    userId: string; // ID của user nhận được update
    updatedUser: FollowingMessageUser; // User được update
    action: "message_sent" | "message_received" | "user_activity_change";
    timestamp: string;
  };
}

export interface FollowingMessageListUpdateEvent {
  type: "following_message_list_update";
  data: {
    userId: string; // ID của user nhận được update
    updatedList: FollowingMessageUser[]; // Danh sách following messages mới
    action: "list_refresh" | "user_moved_to_top";
    timestamp: string;
  };
}
