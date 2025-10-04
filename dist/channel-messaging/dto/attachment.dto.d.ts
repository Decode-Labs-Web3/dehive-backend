import { AttachmentType } from '../enum/enum';
export declare class AttachmentDto {
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
