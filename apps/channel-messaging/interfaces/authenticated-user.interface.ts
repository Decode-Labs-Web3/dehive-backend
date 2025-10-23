import { UserProfile } from "./user-profile.interface";

export interface AuthenticatedUser extends UserProfile {
  _id: string;
  session_id: string;
  fingerprint_hash: string;
}
