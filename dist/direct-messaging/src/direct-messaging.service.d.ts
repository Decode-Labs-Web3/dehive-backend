import { Model } from 'mongoose';
import { DirectConversation, DirectConversationDocument } from '../schemas/direct-conversation.schema';
import { DirectMessage, DirectMessageDocument } from '../schemas/direct-message.schema';
import { CreateOrGetConversationDto } from '../dto/create-or-get-conversation.dto.ts';
import { DirectUploadInitDto, DirectUploadResponseDto } from '../dto/direct-upload.dto';
import { ListDirectMessagesDto } from '../dto/list-direct-messages.dto';
import { SendDirectMessageDto } from '../dto/send-direct-message.dto';
import { DirectUploadDocument } from '../schemas/direct-upload.schema';
import { ConfigService } from '@nestjs/config';
import { ListDirectUploadsDto } from '../dto/list-direct-upload.dto';
export declare class DirectMessagingService {
    private readonly conversationModel;
    private readonly messageModel;
    private readonly directuploadModel;
    private readonly configService;
    constructor(conversationModel: Model<DirectConversationDocument>, messageModel: Model<DirectMessageDocument>, directuploadModel: Model<DirectUploadDocument>, configService: ConfigService);
    private detectAttachmentType;
    private getLimits;
    private validateUploadSize;
    private participantsFilter;
    createOrGetConversation(selfId: string, dto: CreateOrGetConversationDto): Promise<import("mongoose").Document<unknown, {}, DirectConversationDocument, {}, {}> & DirectConversation & import("mongoose").Document<unknown, any, any, Record<string, any>, {}> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
    handleUpload(selfId: string, file: unknown, body: DirectUploadInitDto): Promise<DirectUploadResponseDto>;
    sendMessage(selfId: string, dto: SendDirectMessageDto): Promise<import("mongoose").Document<unknown, {}, DirectMessageDocument, {}, {}> & DirectMessage & import("mongoose").Document<unknown, any, any, Record<string, any>, {}> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
    listMessages(selfId: string, conversationId: string, dto: ListDirectMessagesDto): Promise<{
        page: number;
        limit: number;
        total: number;
        items: (import("mongoose").FlattenMaps<DirectMessageDocument> & Required<{
            _id: import("mongoose").FlattenMaps<unknown>;
        }> & {
            __v: number;
        })[];
    }>;
    editMessage(selfId: string, messageId: string, content: string): Promise<import("mongoose").FlattenMaps<DirectMessage & import("mongoose").Document<unknown, any, any, Record<string, any>, {}> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>>;
    deleteMessage(selfId: string, messageId: string): Promise<import("mongoose").FlattenMaps<DirectMessage & import("mongoose").Document<unknown, any, any, Record<string, any>, {}> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>>;
    listUploads(selfId: string, dto: ListDirectUploadsDto): Promise<{
        page: number;
        limit: number;
        total: number;
        items: (import("mongoose").FlattenMaps<DirectUploadDocument> & Required<{
            _id: import("mongoose").FlattenMaps<unknown>;
        }> & {
            __v: number;
        })[];
    }>;
}
