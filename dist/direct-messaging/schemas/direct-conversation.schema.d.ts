import { Document, Types } from 'mongoose';
export declare class DirectConversation {
    userA: Types.ObjectId;
    userB: Types.ObjectId;
    is_encrypted?: boolean;
}
export type DirectConversationDocument = DirectConversation & Document;
export declare const DirectConversationSchema: import("mongoose").Schema<DirectConversation, import("mongoose").Model<DirectConversation, any, any, any, Document<unknown, any, DirectConversation, any> & DirectConversation & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, DirectConversation, Document<unknown, {}, import("mongoose").FlatRecord<DirectConversation>, {}> & import("mongoose").FlatRecord<DirectConversation> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
