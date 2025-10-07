import { Document, ObjectId, HydratedDocument } from 'mongoose';
export declare class UserDehive extends Document {
    dehive_role: string;
    role_subscription: ObjectId;
    status: string;
    server_count: number;
    last_login: Date;
    bio: string;
    banner_color: string;
    is_banned: boolean;
    banned_by_servers: string[];
}
export declare const UserDehiveSchema: import("mongoose").Schema<UserDehive, import("mongoose").Model<UserDehive, any, any, any, Document<unknown, any, UserDehive, any, {}> & UserDehive & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, UserDehive, Document<unknown, {}, import("mongoose").FlatRecord<UserDehive>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<UserDehive> & Required<{
    _id: unknown;
}> & {
    __v: number;
}>;
export type UserDehiveDocument = HydratedDocument<UserDehive>;
export type UserDehiveLean = UserDehive & {
    _id: ObjectId;
};
