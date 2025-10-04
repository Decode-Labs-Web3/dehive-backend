import { Document, Types } from 'mongoose';
export declare class ServerBan {
    server_id: Types.ObjectId;
    user_dehive_id: Types.ObjectId;
    banned_by: Types.ObjectId;
    reason: string;
    expires_at: Date;
}
export type ServerBanDocument = ServerBan & Document;
export declare const ServerBanSchema: import("mongoose").Schema<ServerBan, import("mongoose").Model<ServerBan, any, any, any, Document<unknown, any, ServerBan, any, {}> & ServerBan & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ServerBan, Document<unknown, {}, import("mongoose").FlatRecord<ServerBan>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<ServerBan> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
