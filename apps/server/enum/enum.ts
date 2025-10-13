// Server Tags Enum
export enum ServerTag {
  GAMING = "gaming",
  FRIENDS = "friends",
  STUDY_GROUP = "study group",
  SCHOOL_CLUB = "school Club",
  LOCAL_COMMUNITY = "Local Community",
  ARTIST_CREATORS = "Artist & Creators",
}

// Server Tags Array for validation
export const SERVER_TAGS = Object.values(ServerTag);

// Server Tags Type
export type ServerTagType = `${ServerTag}`;

// Channel Type Enum
export enum ChannelType {
  TEXT = "TEXT",
  VOICE = "VOICE",
}

// Channel Type Array for validation
export const CHANNEL_TYPES = Object.values(ChannelType);

// Channel Type Type
export type ChannelTypeType = `${ChannelType}`;
