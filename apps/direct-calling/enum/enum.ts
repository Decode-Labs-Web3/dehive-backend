export enum CallStatus {
  CALLING = "calling", // Caller side - đang gọi
  RINGING = "ringing", // Callee side - đang nhận chuông
  CONNECTING = "connecting",
  CONNECTED = "connected", // Đang trong cuộc gọi
  ENDED = "ended", // Kết thúc (timeout hoặc endCall)
  DECLINED = "declined", // Từ chối cuộc gọi
  MISSED = "missed",
  TIMEOUT = "timeout",
}

export enum CallEndReason {
  USER_HANGUP = "user_hangup",
  USER_DECLINED = "user_declined",
  USER_BUSY = "user_busy",
  TIMEOUT = "timeout",
  CONNECTION_ERROR = "connection_error",
  NETWORK_ERROR = "network_error",
  SERVER_ERROR = "server_error",
}
