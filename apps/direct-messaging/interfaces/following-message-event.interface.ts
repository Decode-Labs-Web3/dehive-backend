export interface ConversationUpdateEvent {
  type: "conversation_update";
  data: {
    conversationId: string;
    status: "online" | "offline";
    isCall: boolean;
    lastMessageAt: string;
  };
}
