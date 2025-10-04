import { DirectMessagingService } from './direct-messaging.service';
import { CreateOrGetConversationDto } from '../dto/create-or-get-conversation.dto.ts';
import { DirectUploadInitDto, DirectUploadResponseDto } from '../dto/direct-upload.dto';
import { ListDirectMessagesDto } from '../dto/list-direct-messages.dto';
import { ListDirectUploadsDto } from '../dto/list-direct-upload.dto';
import { SendDirectMessageDto } from '../dto/send-direct-message.dto';
export declare class DirectMessagingController {
    private readonly service;
    constructor(service: DirectMessagingService);
    sendMessage(selfId: string, body: SendDirectMessageDto): Promise<{
        success: boolean;
        statusCode: number;
        message: string;
        data: import("mongoose").Document<unknown, {}, import("../schemas/direct-message.schema").DirectMessageDocument, {}, {}> & import("../schemas/direct-message.schema").DirectMessage & import("mongoose").Document<unknown, any, any, Record<string, any>, {}> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        };
    }>;
    createOrGet(selfId: string, body: CreateOrGetConversationDto): Promise<{
        success: boolean;
        statusCode: number;
        message: string;
        data: import("mongoose").Document<unknown, {}, import("../schemas/direct-conversation.schema").DirectConversationDocument, {}, {}> & import("../schemas/direct-conversation.schema").DirectConversation & import("mongoose").Document<unknown, any, any, Record<string, any>, {}> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        };
    }>;
    list(selfId: string, conversationId: string, query: ListDirectMessagesDto): Promise<{
        success: boolean;
        statusCode: number;
        message: string;
        data: {
            page: number;
            limit: number;
            total: number;
            items: (import("mongoose").FlattenMaps<import("../schemas/direct-message.schema").DirectMessageDocument> & Required<{
                _id: import("mongoose").FlattenMaps<unknown>;
            }> & {
                __v: number;
            })[];
        };
    }>;
    uploadFile(file: Express.Multer.File, body: DirectUploadInitDto, selfId: string): Promise<{
        success: boolean;
        statusCode: number;
        message: string;
        data: DirectUploadResponseDto;
    }>;
    listUploads(selfId: string, query: ListDirectUploadsDto): Promise<{
        success: boolean;
        statusCode: number;
        message: string;
        data: {
            page: number;
            limit: number;
            total: number;
            items: (import("mongoose").FlattenMaps<import("../schemas/direct-upload.schema").DirectUploadDocument> & Required<{
                _id: import("mongoose").FlattenMaps<unknown>;
            }> & {
                __v: number;
            })[];
        };
    }>;
}
