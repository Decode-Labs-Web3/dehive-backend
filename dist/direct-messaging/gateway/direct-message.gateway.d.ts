import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Model } from 'mongoose';
import { DirectMessagingService } from '../src/direct-messaging.service';
import { SendDirectMessageDto } from '../dto/send-direct-message.dto';
import { UserDehiveDocument } from '../../user-dehive-server/schemas/user-dehive.schema';
import { DirectConversationDocument } from '../schemas/direct-conversation.schema';
export declare class DmGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly service;
    private readonly userDehiveModel;
    private readonly conversationModel;
    server: Server;
    private readonly meta;
    constructor(service: DirectMessagingService, userDehiveModel: Model<UserDehiveDocument>, conversationModel: Model<DirectConversationDocument>);
    private send;
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleIdentity(userDehiveId: string, client: Socket): Promise<void>;
    handleSendMessage(data: SendDirectMessageDto, client: Socket): Promise<void>;
    handleEditMessage(data: {
        messageId: string;
        content: string;
    }, client: Socket): Promise<void>;
    handleDeleteMessage(data: {
        messageId: string;
    }, client: Socket): Promise<void>;
}
