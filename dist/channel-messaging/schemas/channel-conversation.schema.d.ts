import { Document, Types } from 'mongoose';
export declare class ChannelConversation {
    channelId: Types.ObjectId;
    key_contract?: string;
}
export type ChannelConversationDocument = ChannelConversation & Document;
export declare const ChannelConversationSchema: import("mongoose").Schema<ChannelConversation, import("mongoose").Model<ChannelConversation, any, any, any, Document<unknown, any, ChannelConversation, any, {}> & ChannelConversation & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ChannelConversation, Document<unknown, {}, import("mongoose").FlatRecord<ChannelConversation>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<ChannelConversation> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
