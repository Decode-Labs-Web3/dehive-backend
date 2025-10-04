import { Document, Types } from 'mongoose';
export declare class Upload {
    ownerId: Types.ObjectId;
    serverId?: Types.ObjectId;
    channelId?: Types.ObjectId;
    type: string;
    url: string;
    name: string;
    size: number;
    mimeType: string;
    width?: number;
    height?: number;
    durationMs?: number;
    thumbnailUrl?: string;
}
export type UploadDocument = Upload & Document;
export declare const UploadSchema: import("mongoose").Schema<Upload, import("mongoose").Model<Upload, any, any, any, Document<unknown, any, Upload, any, {}> & Upload & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Upload, Document<unknown, {}, import("mongoose").FlatRecord<Upload>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<Upload> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
