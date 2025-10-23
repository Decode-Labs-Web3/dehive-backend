export interface ConversationUpdateEvent {
  type: "conversation_update";
  data: {
    conversationId: string;
    isActive: boolean;
    isCall: boolean;
    lastMessageAt: string;
  };
}
