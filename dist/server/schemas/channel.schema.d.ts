import { Document, Types } from 'mongoose';
import { ChannelType } from '../dto/create-channel.dto';
export declare class Channel {
    name: string;
    type: ChannelType;
    category_id: Types.ObjectId;
    topic: string;
}
export type ChannelDocument = Channel & Document;
export declare const ChannelSchema: import("mongoose").Schema<Channel, import("mongoose").Model<Channel, any, any, any, Document<unknown, any, Channel, any, {}> & Channel & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Channel, Document<unknown, {}, import("mongoose").FlatRecord<Channel>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<Channel> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
