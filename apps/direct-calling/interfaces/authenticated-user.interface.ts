import { UserProfile } from "./user-profile.interface";

export interface AuthenticatedUser extends UserProfile {
  session_id: string;
  fingerprint_hash: string;
}
