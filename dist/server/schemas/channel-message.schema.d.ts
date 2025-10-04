import { Document, Types } from 'mongoose';
export declare class ChannelMessage {
    message: string;
    sender: Types.ObjectId;
    channel_id: Types.ObjectId;
    is_encrypted: boolean;
    attachments: Record<string, any>[];
    is_edited: boolean;
}
export type ChannelMessageDocument = ChannelMessage & Document;
export declare const ChannelMessageSchema: import("mongoose").Schema<ChannelMessage, import("mongoose").Model<ChannelMessage, any, any, any, Document<unknown, any, ChannelMessage, any, {}> & ChannelMessage & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ChannelMessage, Document<unknown, {}, import("mongoose").FlatRecord<ChannelMessage>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<ChannelMessage> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
