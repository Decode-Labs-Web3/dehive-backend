import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server as IOServer, Socket } from 'socket.io';
import { CreateMessageDto } from '../dto/create-message.dto';
import { MessagingService } from '../src/channel-messaging.service';
import { Model } from 'mongoose';
import { UserDehiveDocument } from '../../user-dehive-server/schemas/user-dehive.schema';
import { ServerDocument } from '../../server/schemas/server.schema';
import { CategoryDocument } from '../../server/schemas/category.schema';
import { ChannelDocument } from '../../server/schemas/channel.schema';
import { UserDehiveServerDocument } from '../../user-dehive-server/schemas/user-dehive-server.schema';
import { ChannelConversationDocument } from '../schemas/channel-conversation.schema';
export declare class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly messagingService;
    private readonly userDehiveModel;
    private readonly serverModel;
    private readonly categoryModel;
    private readonly channelModel;
    private readonly userDehiveServerModel;
    private readonly channelConversationModel;
    server: IOServer;
    constructor(messagingService: MessagingService, userDehiveModel: Model<UserDehiveDocument>, serverModel: Model<ServerDocument>, categoryModel: Model<CategoryDocument>, channelModel: Model<ChannelDocument>, userDehiveServerModel: Model<UserDehiveServerDocument>, channelConversationModel: Model<ChannelConversationDocument>);
    private readonly meta;
    private send;
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleIdentity(userDehiveId: string, client: Socket): Promise<void>;
    handleJoinChannel(data: {
        serverId: string;
        categoryId: string;
        channelId: string;
    }, client: Socket): Promise<void>;
    handleJoinConversation(payload: string | {
        conversationId: string;
    }, client: Socket): void;
    handleMessage(data: CreateMessageDto, client: Socket): Promise<void>;
    handleEditMessage(data: {
        messageId: string;
        content: string;
    }, client: Socket): Promise<void>;
    handleDeleteMessage(data: {
        messageId: string;
    }, client: Socket): Promise<void>;
}
