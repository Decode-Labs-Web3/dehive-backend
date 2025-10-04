import { Document, Types } from 'mongoose';
import { ServerRole } from '../enum/enum';
export declare class UserDehiveServer {
    user_dehive_id: Types.ObjectId;
    server_id: Types.ObjectId;
    role: ServerRole;
    is_muted: boolean;
    is_banned: boolean;
    joined_at: Date;
}
export type UserDehiveServerDocument = UserDehiveServer & Document;
export declare const UserDehiveServerSchema: import("mongoose").Schema<UserDehiveServer, import("mongoose").Model<UserDehiveServer, any, any, any, Document<unknown, any, UserDehiveServer, any> & UserDehiveServer & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, UserDehiveServer, Document<unknown, {}, import("mongoose").FlatRecord<UserDehiveServer>, {}> & import("mongoose").FlatRecord<UserDehiveServer> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
