export interface AuthenticatedUser {
  _id: string;
  userId: string;
  email: string;
  username: string;
  role: "user" | "admin" | "moderator";
  session_id?: string;
  fingerprint_hash?: string;
}
