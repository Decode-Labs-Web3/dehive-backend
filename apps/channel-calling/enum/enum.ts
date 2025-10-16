export enum ChannelCallStatus {
  WAITING = "waiting", // Chưa ai join
  ACTIVE = "active", // Có người đang call
  ENDED = "ended", // Đã kết thúc
}

export enum ParticipantStatus {
  JOINING = "joining",
  CONNECTED = "connected",
  LEFT = "left",
  DISCONNECTED = "disconnected",
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
