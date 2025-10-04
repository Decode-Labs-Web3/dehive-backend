import { Document, Types } from 'mongoose';
export declare class InviteLink {
    code: string;
    server_id: Types.ObjectId;
    expiredAt: Date;
    creator_id: Types.ObjectId;
    isUsed: boolean;
}
export type InviteLinkDocument = InviteLink & Document;
export declare const InviteLinkSchema: import("mongoose").Schema<InviteLink, import("mongoose").Model<InviteLink, any, any, any, Document<unknown, any, InviteLink, any, {}> & InviteLink & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, InviteLink, Document<unknown, {}, import("mongoose").FlatRecord<InviteLink>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<InviteLink> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
