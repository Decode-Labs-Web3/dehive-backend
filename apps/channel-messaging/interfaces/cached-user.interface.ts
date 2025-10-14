import { UserProfile } from "./user-profile.interface";

// Interface for cached user with _id field
export interface CachedUser extends UserProfile {
  _id: string;
}
