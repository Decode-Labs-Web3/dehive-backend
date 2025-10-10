/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
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
  server: Server;

  private readonly meta = new WeakMap<Socket, SocketMeta>();

  constructor(
    private readonly service: DirectMessagingService,
    @InjectModel(UserDehive.name)
    private readonly userDehiveModel: Model<UserDehiveDocument>,
    @InjectModel(DirectConversation.name)
    private readonly conversationModel: Model<DirectConversationDocument>,
  ) {}

  private send(client: Socket, event: string, data: unknown) {
    // Ensure data is properly serialized
    const serializedData = JSON.parse(JSON.stringify(data));
    client.emit(event, serializedData);
  }

  /**
   * Helper function to format message data consistently for WebSocket responses
   * This ensures WebSocket responses match API response format
   */
  private formatMessageData(message: any) {
    return {
      _id: message._id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      content: message.content,
      attachments: message.attachments || [],
      isEdited: message.isEdited || false,
      editedAt: message.editedAt || null,
      isDeleted: message.isDeleted || false,
      createdAt: (message as any).createdAt,
      updatedAt: (message as any).updatedAt,
    };
  }

  handleConnection(client: Socket) {
    console.log('[DM-WS] Client connected. Awaiting identity.');
    this.meta.set(client, {});
  }

  handleDisconnect(client: Socket) {
    const meta = this.meta.get(client);
    if (meta?.userDehiveId) {
      console.log(`[DM-WS] User ${meta.userDehiveId} disconnected.`);
    }
    this.meta.delete(client);
  }

  @SubscribeMessage('identity')
  async handleIdentity(
    @MessageBody() data: string | { userDehiveId: string },
    @ConnectedSocket() client: Socket,
  ) {
    console.log(`[DM-WS] Identity request received:`, data);
    console.log(`[DM-WS] Identity data type:`, typeof data);

    // Handle both string and object formats
    let userDehiveId: string;
    if (typeof data === 'string') {
      userDehiveId = data;
    } else if (typeof data === 'object' && data?.userDehiveId) {
      userDehiveId = data.userDehiveId;
    } else {
      console.log(`[DM-WS] Invalid identity format:`, data);
      return this.send(client, 'error', {
        message: 'Invalid identity format. Send userDehiveId as string or {userDehiveId: string}',
        code: 'INVALID_FORMAT',
        timestamp: new Date().toISOString()
      });
    }

    console.log(`[DM-WS] Extracted userDehiveId: ${userDehiveId}`);

    if (!userDehiveId || !Types.ObjectId.isValid(userDehiveId)) {
      console.log(`[DM-WS] Invalid userDehiveId: ${userDehiveId}`);
      return this.send(client, 'error', {
        message: 'Invalid userDehiveId',
        code: 'INVALID_USER_ID',
        timestamp: new Date().toISOString()
      });
    }

    console.log(`[DM-WS] Checking if user exists: ${userDehiveId}`);
    const exists = await this.userDehiveModel.exists({
      _id: new Types.ObjectId(userDehiveId),
    });

    console.log(`[DM-WS] User exists result: ${exists}`);
    if (!exists) {
      console.log(`[DM-WS] User not found in database: ${userDehiveId}`);
      return this.send(client, 'error', {
        message: 'User not found',
        code: 'USER_NOT_FOUND',
        timestamp: new Date().toISOString()
      });
    }

    const meta = this.meta.get(client);
    if (meta) {
      meta.userDehiveId = userDehiveId;
      void client.join(`user:${userDehiveId}`);
      console.log(`[DM-WS] User identified as ${userDehiveId}`);
      this.send(client, 'identityConfirmed', {
        userDehiveId,
        status: 'success',
        timestamp: new Date().toISOString()
      });
    }
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody() data: SendDirectMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    const meta = this.meta.get(client);
    const selfId = meta?.userDehiveId;

    console.log(`[DM-WS] SendMessage request from user: ${selfId}`);
    console.log(`[DM-WS] SendMessage data type:`, typeof data);
    console.log(`[DM-WS] SendMessage data:`, JSON.stringify(data, null, 2));

    if (!selfId) {
      return this.send(client, 'error', {
        message: 'Please identify first',
        code: 'AUTHENTICATION_REQUIRED',
        timestamp: new Date().toISOString()
      });
    }

    try {
      // Parse JSON string if needed
      let parsedData = data;
      if (typeof data === 'string') {
        try {
          parsedData = JSON.parse(data);
        } catch (parseError) {
          console.error('[DM-WS] Failed to parse JSON data:', parseError);
          return this.send(client, 'error', {
            message: 'Invalid JSON format',
            code: 'INVALID_JSON',
            timestamp: new Date().toISOString()
          });
        }
      }

      // Validate data structure
      if (!parsedData || typeof parsedData !== 'object') {
        return this.send(client, 'error', {
          message: 'Invalid message data format',
        });
      }

      // Validate conversationId
      if (!parsedData.conversationId || !Types.ObjectId.isValid(parsedData.conversationId)) {
        return this.send(client, 'error', {
          message: 'Invalid conversationId',
        });
      }

      // Validate content
      if (typeof parsedData.content !== 'string') {
        return this.send(client, 'error', {
          message: 'Content must be a string',
        });
      }
      if (parsedData.content.length > 2000) {
        return this.send(client, 'error', {
          message: 'Content must not exceed 2000 characters',
        });
      }

      // Validate uploadIds
      if (!Array.isArray(parsedData.uploadIds)) {
        return this.send(client, 'error', {
          message: 'uploadIds must be an array',
        });
      }
      if (parsedData.uploadIds.length > 0) {
        const allValid = parsedData.uploadIds.every((id: unknown) => {
          return typeof id === 'string' && Types.ObjectId.isValid(id);
        });
        if (!allValid) {
          return this.send(client, 'error', {
            message: 'One or more uploadIds are invalid',
          });
        }
      }

      const savedMessage = await this.service.sendMessage(selfId, parsedData);
      const conv = await this.conversationModel
        .findById(parsedData.conversationId)
        .lean();
      if (!conv) {
        return this.send(client, 'error', {
          message: 'Conversation not found',
        });
      }

      const recipientId =
        String(conv.userA) === selfId ? String(conv.userB) : String(conv.userA);

      const messageToBroadcast = this.formatMessageData(savedMessage);

      // Ensure messageToBroadcast is properly serialized
      const serializedMessage = JSON.parse(JSON.stringify(messageToBroadcast));
      this.server
        .to(`user:${recipientId}`)
        .to(`user:${selfId}`)
        .emit('newMessage', serializedMessage);
    } catch (error) {
      console.error('[DM-WS] Error handling message:', error);
      console.error('[DM-WS] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      this.send(client, 'error', {
        message: 'Failed to send message',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  @SubscribeMessage('editMessage')
  async handleEditMessage(
    @MessageBody() data: { messageId: string; content: string },
    @ConnectedSocket() client: Socket,
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
        ...this.formatMessageData(updated),
        messageId: updated._id, // Keep messageId for backward compatibility
      };
      // Ensure payload is properly serialized
      const serializedPayload = JSON.parse(JSON.stringify(payload));
      this.server
        .to(`user:${recipientId}`)
        .to(`user:${selfId}`)
        .emit('messageEdited', serializedPayload);
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
    @ConnectedSocket() client: Socket,
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
        ...this.formatMessageData(updated),
        messageId: updated._id, // Keep messageId for backward compatibility
        isDeleted: true, // Override isDeleted for delete events
      };
      // Ensure payload is properly serialized
      const serializedPayload = JSON.parse(JSON.stringify(payload));
      this.server
        .to(`user:${recipientId}`)
        .to(`user:${selfId}`)
        .emit('messageDeleted', serializedPayload);
    } catch (error) {
      this.send(client, 'error', {
        message: 'Failed to delete message',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
