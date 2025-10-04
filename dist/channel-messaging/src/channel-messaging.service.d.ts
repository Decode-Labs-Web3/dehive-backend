import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { AuthServiceClient } from './auth-service.client';
import { ChannelMessage, ChannelMessageDocument } from '../schemas/channel-message.schema';
import { ChannelConversation, ChannelConversationDocument } from '../schemas/channel-conversation.schema';
import { CreateMessageDto } from '../dto/create-message.dto';
import { GetMessagesDto } from '../dto/get-messages.dto';
import { UploadDocument } from '../schemas/upload.schema';
import { UploadInitDto, UploadResponseDto } from '../dto/channel-upload.dto';
import { AttachmentType } from '../enum/enum';
import { UserDehiveServerDocument } from '../../user-dehive-server/schemas/user-dehive-server.schema';
import { UserDehiveDocument } from '../../user-dehive-server/schemas/user-dehive.schema';
export declare class MessagingService {
    private readonly channelMessageModel;
    private readonly channelConversationModel;
    private readonly uploadModel;
    private readonly userDehiveServerModel;
    private readonly userDehiveModel;
    private readonly configService;
    private readonly authClient;
    constructor(channelMessageModel: Model<ChannelMessageDocument>, channelConversationModel: Model<ChannelConversationDocument>, uploadModel: Model<UploadDocument>, userDehiveServerModel: Model<UserDehiveServerDocument>, userDehiveModel: Model<UserDehiveDocument>, configService: ConfigService, authClient: AuthServiceClient);
    private detectAttachmentType;
    private getLimits;
    private validateUploadSize;
    handleUpload(file: unknown, body: UploadInitDto, userId?: string): Promise<UploadResponseDto>;
    createMessage(createMessageDto: CreateMessageDto, senderId: string): Promise<ChannelMessageDocument>;
    getOrCreateConversationByChannelId(channelId: string): Promise<import("mongoose").Document<unknown, {}, ChannelConversationDocument, {}, {}> & ChannelConversation & import("mongoose").Document<unknown, any, any, Record<string, any>, {}> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
    getMessagesByConversationId(conversationId: string, getMessagesDto: GetMessagesDto): Promise<any[]>;
    editMessage(messageId: string, editorUserDehiveId: string, newContent: string): Promise<import("mongoose").Document<unknown, {}, ChannelMessageDocument, {}, {}> & ChannelMessage & import("mongoose").Document<unknown, any, any, Record<string, any>, {}> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
    deleteMessage(messageId: string, requesterUserDehiveId: string): Promise<import("mongoose").Document<unknown, {}, ChannelMessageDocument, {}, {}> & ChannelMessage & import("mongoose").Document<unknown, any, any, Record<string, any>, {}> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
    listUploads(params: {
        serverId: string;
        userId: string;
        type?: AttachmentType;
        page: number;
        limit: number;
    }): Promise<{
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
    }>;
}
