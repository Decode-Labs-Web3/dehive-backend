import { Document, Types } from 'mongoose';
export declare class DirectUpload {
    ownerId: Types.ObjectId;
    conversationId: Types.ObjectId;
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
export type DirectUploadDocument = DirectUpload & Document;
export declare const DirectUploadSchema: import("mongoose").Schema<DirectUpload, import("mongoose").Model<DirectUpload, any, any, any, Document<unknown, any, DirectUpload, any, {}> & DirectUpload & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, DirectUpload, Document<unknown, {}, import("mongoose").FlatRecord<DirectUpload>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<DirectUpload> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
