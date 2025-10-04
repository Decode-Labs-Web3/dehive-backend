import { AttachmentType } from '../enum/enum';
export declare class ListUploadsDto {
    serverId: string;
    type?: AttachmentType;
    page: number;
    limit: number;
}
