export enum CallStatus {
  CALLING = "calling",
  RINGING = "ringing",
  CONNECTING = "connecting",
  CONNECTED = "connected",
  ENDED = "ended",
  DECLINED = "declined",
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
