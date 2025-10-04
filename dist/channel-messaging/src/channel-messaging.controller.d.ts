import { MessagingService } from './channel-messaging.service';
import { GetMessagesDto } from '../dto/get-messages.dto';
import { UploadInitDto } from '../dto/channel-upload.dto';
import { ListUploadsDto } from '../dto/list-channel-upload.dto';
import { CreateMessageDto } from '../dto/create-message.dto';
export declare class MessagingController {
    private readonly messagingService;
    constructor(messagingService: MessagingService);
    sendMessage(userId: string, createMessageDto: CreateMessageDto): Promise<{
        success: boolean;
        statusCode: number;
        message: string;
        data: import("../schemas/channel-message.schema").ChannelMessageDocument;
    }>;
    getMessages(conversationId: string, query: GetMessagesDto): Promise<{
        success: boolean;
        statusCode: number;
        message: string;
        data: any[];
    }>;
    upload(file: Express.Multer.File, body: UploadInitDto, userId: string): Promise<any>;
    listUploads(userId: string, query: ListUploadsDto): Promise<{
        success: boolean;
        statusCode: number;
        message: string;
        data: {
            page: number;
            limit: number;
            total: number;
            items: {
                _id: import("mongoose").FlattenMaps<unknown>;
                type: string;
                url: string;
                name: string;
                size: number;
                mimeType: string;
                width: number | undefined;
                height: number | undefined;
                durationMs: number | undefined;
                thumbnailUrl: string | undefined;
                createdAt: Date | undefined;
            }[];
        };
    }>;
}
