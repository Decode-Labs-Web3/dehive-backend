export enum ServerTag {
  GAMING = "Gaming",
  FRIENDS = "Friends",
  STUDY_GROUP = "Study Group",
  SCHOOL_CLUB = "School Club",
  LOCAL_COMMUNITY = "Local Community",
  ARTIST_CREATORS = "Artist & Creators",
}

export const SERVER_TAGS = Object.values(ServerTag);

export type ServerTagType = `${ServerTag}`;

export enum ChannelType {
  TEXT = "TEXT",
  VOICE = "VOICE",
}

export const CHANNEL_TYPES = Object.values(ChannelType);

export type ChannelTypeType = `${ChannelType}`;

export enum BlockchainNetwork {
  ETHEREUM = "ethereum",
  BASE = "base",
  BSC = "bsc",
}

export const BLOCKCHAIN_NETWORKS = Object.values(BlockchainNetwork);
export type BlockchainNetworkType = `${BlockchainNetwork}`;

export enum ServerRole {
  OWNER = "owner",
  MODERATOR = "moderator",
  MEMBER = "member",
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
