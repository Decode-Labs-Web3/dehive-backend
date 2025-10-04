import { AttachmentType } from '../enum/enum';
export declare class UploadInitDto {
    serverId?: string;
    conversationId?: string;
}
export declare class UploadResponseDto {
    uploadId: string;
    type: AttachmentType;
    url: string;
    name: string;
    size: number;
    mimeType: string;
    errorMessage?: string;
    width?: number;
    height?: number;
    durationMs?: number;
    thumbnailUrl?: string;
}
