export interface AuthenticatedUser {
    _id: string;
    userId: string;
    email: string;
    username: string;
    display_name?: string;
    avatar?: string | null;
    role: 'user' | 'admin' | 'moderator';
}
