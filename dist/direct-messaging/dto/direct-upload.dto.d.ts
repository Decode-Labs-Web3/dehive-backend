import { AttachmentType } from '../enum/enum';
export declare class DirectUploadInitDto {
    conversationId: string;
}
export declare class DirectUploadResponseDto {
    uploadId: string;
    type: AttachmentType;
    url: string;
    name: string;
    size: number;
    mimeType: string;
    width?: number;
    height?: number;
    durationMs?: number;
    thumbnailUrl?: string;
}
