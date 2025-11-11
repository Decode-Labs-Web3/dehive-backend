export enum Status {
  Online = "online",
  Offline = "offline",
  Away = "away",
  Busy = "busy",
}

export enum ServerRole {
  OWNER = "owner",
  MODERATOR = "moderator",
  MEMBER = "member",
}

export enum enumUserRole {
  ADMIN = "admin",
  MODERATOR = "moderator",
  USER = "user",
}

export enum AuditLogAction {
  MEMBER_JOIN = "member_join",
  MEMBER_LEAVE = "member_leave",
  MEMBER_KICK = "member_kick",
  MEMBER_BAN = "member_ban",
  MEMBER_UNBAN = "member_unban",
  INVITE_CREATE = "invite_create",
  INVITE_DELETE = "invite_delete",
  ROLE_UPDATE = "role_update",
  SERVER_UPDATE = "server_update",
  CATEGORY_CREATE = "category_create",
  CATEGORY_UPDATE = "category_update",
  CATEGORY_DELETE = "category_delete",
  CHANNEL_CREATE = "channel_create",
  CHANNEL_UPDATE = "channel_update",
  CHANNEL_DELETE = "channel_delete",
  MESSAGE_DELETE = "message_delete",
}
