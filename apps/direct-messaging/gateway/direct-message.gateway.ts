/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server as WSServer, WebSocket } from 'ws';
import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { DirectMessagingService } from '../src/direct-messaging.service';
import { SendDirectMessageDto } from '../dto/send-direct-message.dto';
import {
  UserDehive,
  UserDehiveDocument,
} from '../../user-dehive-server/schemas/user-dehive.schema';
import {
  DirectConversation,
  DirectConversationDocument,
} from '../schemas/direct-conversation.schema';

type SocketMeta = { userDehiveId?: string };

@WebSocketGateway({
  cors: { origin: '*' },
})
export class DmGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: WSServer;

  private readonly userSockets = new Map<string, WebSocket>();
  private readonly meta = new WeakMap<WebSocket, SocketMeta>();

  constructor(
    private readonly service: DirectMessagingService,
    @InjectModel(UserDehive.name)
    private readonly userDehiveModel: Model<UserDehiveDocument>,
    @InjectModel(DirectConversation.name)
    private readonly conversationModel: Model<DirectConversationDocument>,
  ) {}

  private send(client: WebSocket, event: string, data: unknown) {
    client.send(JSON.stringify({ event, data }));
  }

  handleConnection(client: WebSocket) {
    console.log('[DM-WS] Client connected. Awaiting identity.');
    this.meta.set(client, {});
  }

  handleDisconnect(client: WebSocket) {
    const meta = this.meta.get(client);
    if (meta?.userDehiveId) {
      this.userSockets.delete(meta.userDehiveId);
      console.log(`[DM-WS] User ${meta.userDehiveId} disconnected.`);
    }
    this.meta.delete(client);
  }

  @SubscribeMessage('identity')
  async handleIdentity(
    @MessageBody() userDehiveId: string,
    @ConnectedSocket() client: WebSocket,
  ) {
    if (!userDehiveId || !Types.ObjectId.isValid(userDehiveId)) {
      return this.send(client, 'error', { message: 'Invalid userDehiveId' });
    }

    const exists = await this.userDehiveModel.exists({
      _id: new Types.ObjectId(userDehiveId),
    });
    if (!exists) {
      return this.send(client, 'error', { message: 'User not found' });
    }

    const meta = this.meta.get(client);
    if (meta) {
      meta.userDehiveId = userDehiveId;
      this.userSockets.set(userDehiveId, client);
      console.log(`[DM-WS] User identified as ${userDehiveId}`);
      this.send(client, 'identityConfirmed', { userDehiveId });
    }
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody() data: SendDirectMessageDto,
    @ConnectedSocket() client: WebSocket,
  ) {
    const meta = this.meta.get(client);
    const selfId = meta?.userDehiveId;

    if (!selfId) {
      return this.send(client, 'error', { message: 'Please identify first' });
    }

    try {
      const savedMessage = await this.service.sendMessage(selfId, data);
      const conv = await this.conversationModel
        .findById(data.conversationId)
        .lean();
      if (!conv) {
        return this.send(client, 'error', {
          message: 'Conversation not found',
        });
      }

      const recipientId =
        String(conv.userA) === selfId ? String(conv.userB) : String(conv.userA);

      const messageToBroadcast = {
        _id: savedMessage._id,
        conversationId: savedMessage.conversationId,
        senderId: savedMessage.senderId,
        content: savedMessage.content,
        attachments: savedMessage.attachments,
        createdAt: savedMessage.get('createdAt'),
      };

      const recipientSocket = this.userSockets.get(recipientId);
      if (recipientSocket) {
        this.send(recipientSocket, 'newMessage', messageToBroadcast);
      }

      this.send(client, 'newMessage', messageToBroadcast);
    } catch (error) {
      console.error('[DM-WS] Error handling message:', error);
      this.send(client, 'error', {
        message: 'Failed to send message',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  @SubscribeMessage('editMessage')
  async handleEditMessage(
    @MessageBody() data: { messageId: string; content: string },
    @ConnectedSocket() client: WebSocket,
  ) {
    const meta = this.meta.get(client);
    const selfId = meta?.userDehiveId;
    if (!selfId)
      return this.send(client, 'error', { message: 'Please identify first' });
    try {
      const updated = await this.service.editMessage(
        selfId,
        data?.messageId,
        data?.content ?? '',
      );

      const conv = await this.conversationModel
        .findById(updated.conversationId)
        .lean();
      if (!conv) return;
      const recipientId =
        String(conv.userA) === selfId ? String(conv.userB) : String(conv.userA);
      const payload = {
        _id: updated._id,
        messageId: updated._id,
        conversationId: updated.conversationId,
        content: updated.content,
        isEdited: true,
        editedAt: (updated as unknown as { editedAt?: Date }).editedAt,
      };
      const recipientSocket = this.userSockets.get(recipientId);
      if (recipientSocket) this.send(recipientSocket, 'messageEdited', payload);
      this.send(client, 'messageEdited', payload);
    } catch (error) {
      this.send(client, 'error', {
        message: 'Failed to edit message',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  @SubscribeMessage('deleteMessage')
  async handleDeleteMessage(
    @MessageBody() data: { messageId: string },
    @ConnectedSocket() client: WebSocket,
  ) {
    const meta = this.meta.get(client);
    const selfId = meta?.userDehiveId;
    if (!selfId)
      return this.send(client, 'error', { message: 'Please identify first' });
    try {
      const updated = await this.service.deleteMessage(selfId, data?.messageId);
      const conv = await this.conversationModel
        .findById(updated.conversationId)
        .lean();
      if (!conv) return;
      const recipientId =
        String(conv.userA) === selfId ? String(conv.userB) : String(conv.userA);
      const payload = {
        _id: updated._id,
        messageId: updated._id,
        conversationId: updated.conversationId,
        isDeleted: true,
      };
      const recipientSocket = this.userSockets.get(recipientId);
      if (recipientSocket)
        this.send(recipientSocket, 'messageDeleted', payload);
      this.send(client, 'messageDeleted', payload);
    } catch (error) {
      this.send(client, 'error', {
        message: 'Failed to delete message',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
