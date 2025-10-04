import { Document, Types } from 'mongoose';
export declare class DirectMessage {
    conversationId: Types.ObjectId;
    senderId: Types.ObjectId;
    content: string;
    attachments: Record<string, any>[];
    isEdited: boolean;
    editedAt?: Date;
    isDeleted: boolean;
}
export type DirectMessageDocument = DirectMessage & Document;
export declare const DirectMessageSchema: import("mongoose").Schema<DirectMessage, import("mongoose").Model<DirectMessage, any, any, any, Document<unknown, any, DirectMessage, any> & DirectMessage & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, DirectMessage, Document<unknown, {}, import("mongoose").FlatRecord<DirectMessage>, {}> & import("mongoose").FlatRecord<DirectMessage> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
