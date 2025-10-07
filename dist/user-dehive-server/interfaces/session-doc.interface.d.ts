import { Types } from 'mongoose';
import { UserProfile } from './user-profile.interface';
export type SessionCacheDoc = {
    session_token: string;
    access_token: string;
    user: UserProfile;
    expires_at: Date;
};
export type SessionDoc = {
    _id: string;
    user_dehive_id: Types.ObjectId;
    device_fingerprint_id: Types.ObjectId;
    session_token: string;
    access_token: string;
    expires_at: Date;
    created_at: Date;
    updated_at: Date;
    is_active: boolean;
    revoked_at: Date;
};
