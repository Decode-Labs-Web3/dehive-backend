import { Document, Types } from 'mongoose';
export declare class ChannelMessage {
    content: string;
    conversationId?: Types.ObjectId;
    senderId: Types.ObjectId;
    channelId: Types.ObjectId;
    attachments: Record<string, any>[];
    isEdited: boolean;
    editedAt?: Date;
    isDeleted: boolean;
}
export type ChannelMessageDocument = ChannelMessage & Document;
export declare const ChannelMessageSchema: import("mongoose").Schema<ChannelMessage, import("mongoose").Model<ChannelMessage, any, any, any, Document<unknown, any, ChannelMessage, any> & ChannelMessage & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ChannelMessage, Document<unknown, {}, import("mongoose").FlatRecord<ChannelMessage>, {}> & import("mongoose").FlatRecord<ChannelMessage> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
