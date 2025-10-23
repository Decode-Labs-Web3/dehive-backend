import { UserProfile } from "./user-profile.interface";

export interface CachedUser extends UserProfile {
  _id: string;
}
