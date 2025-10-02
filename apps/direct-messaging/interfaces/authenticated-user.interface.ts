export interface AuthenticatedUser {
  _id: string;
  userId: string;
  email: string;
  username: string;
  role: 'user' | 'admin' | 'moderator';
}
