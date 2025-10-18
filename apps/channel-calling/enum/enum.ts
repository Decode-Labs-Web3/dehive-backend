export enum CallStatus {
  RINGING = "ringing",
  CONNECTING = "connecting",
  CONNECTED = "connected",
  ENDED = "ended",
  DECLINED = "declined",
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
  ALL_PARTICIPANTS_LEFT = "all_participants_left",
}

export enum MediaType {
  AUDIO = "audio",
  VIDEO = "video",
  SCREEN_SHARE = "screen_share",
}

export enum MediaState {
  ENABLED = "enabled",
  DISABLED = "disabled",
  MUTED = "muted",
  UNMUTED = "unmuted",
}
