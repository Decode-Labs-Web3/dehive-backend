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
