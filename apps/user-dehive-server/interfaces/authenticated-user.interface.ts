import { UserProfile } from "./user-profile.interface";

export interface AuthenticatedUser extends UserProfile {
  session_id: string;
}
