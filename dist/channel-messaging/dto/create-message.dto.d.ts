import { AttachmentDto } from './attachment.dto';
export declare class CreateMessageDto {
    conversationId: string;
    content: string;
    uploadIds: string[];
    attachments?: AttachmentDto[];
}
