/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server as IOServer, Socket } from 'socket.io';
import { CreateMessageDto } from '../dto/create-message.dto';
import { MessagingService } from '../src/channel-messaging.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  UserDehive,
  UserDehiveDocument,
} from '../../user-dehive-server/schemas/user-dehive.schema';
import { Server, ServerDocument } from '../../server/schemas/server.schema';
import {
  Category,
  CategoryDocument,
} from '../../server/schemas/category.schema';
import { Channel, ChannelDocument } from '../../server/schemas/channel.schema';
import {
  UserDehiveServer,
  UserDehiveServerDocument,
} from '../../user-dehive-server/schemas/user-dehive-server.schema';
import {
  ChannelConversation,
  ChannelConversationDocument,
} from '../schemas/channel-conversation.schema';

type SocketMeta = { userDehiveId?: string };

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: IOServer;

  constructor(
    private readonly messagingService: MessagingService,
    @InjectModel(UserDehive.name)
    private readonly userDehiveModel: Model<UserDehiveDocument>,
    @InjectModel(Server.name)
    private readonly serverModel: Model<ServerDocument>,
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
    @InjectModel(Channel.name)
    private readonly channelModel: Model<ChannelDocument>,
    @InjectModel(UserDehiveServer.name)
    private readonly userDehiveServerModel: Model<UserDehiveServerDocument>,
    @InjectModel(ChannelConversation.name)
    private readonly channelConversationModel: Model<ChannelConversationDocument>,
  ) {}

  private readonly meta = new WeakMap<Socket, SocketMeta>();

  private send(client: Socket, event: string, data: unknown) {
    client.emit(event, data);
  }

  handleConnection(client: Socket) {
    console.log('[WebSocket] Client connected. Awaiting identity.');
    this.meta.set(client, {});
  }

  handleDisconnect(client: Socket) {
    console.log('[WebSocket] Client disconnected.');
    const meta = this.meta.get(client);
    if (meta) this.meta.delete(client);
  }

  @SubscribeMessage('identity')
  async handleIdentity(
    @MessageBody() userDehiveId: string,
    @ConnectedSocket() client: Socket,
  ) {
    if (!userDehiveId || typeof userDehiveId !== 'string') {
      return this.send(client, 'error', {
        message: 'Invalid identity payload. Please send a string userDehiveId.',
      });
    }
    const meta = this.meta.get(client);
    if (!meta) {
      return this.send(client, 'error', {
        message: 'Internal server error: No client metadata found.',
      });
    }
    if (!Types.ObjectId.isValid(userDehiveId)) {
      return this.send(client, 'error', {
        message: 'Invalid userDehiveId format.',
      });
    }
    try {
      const exists = await this.userDehiveModel.exists({
        _id: new Types.ObjectId(userDehiveId),
      });
      if (!exists) {
        console.log(`[WebSocket] UserDehive not found: ${userDehiveId}`);
        return this.send(client, 'error', {
          message: 'UserDehive not found.',
        });
      }
    } catch (error) {
      return this.send(client, 'error', {
        message: 'Database error while checking user existence.',
      });
    }
    console.log(
      `[WebSocket] Client is identifying as UserDehive ID: ${userDehiveId}`,
    );
    meta.userDehiveId = userDehiveId;
    try {
      this.send(
        client,
        'identityConfirmed',
        {
          message: `You are now identified as ${userDehiveId}`,
          userDehiveId: userDehiveId
        },
      );
      console.log(`[WebSocket] identityConfirmed sent successfully`);
    } catch (error) {
      console.error(`[WebSocket] Error sending identityConfirmed:`, error);
    }
  }

  @SubscribeMessage('joinChannel')
  async handleJoinChannel(
    @MessageBody()
    data: { serverId: string; categoryId: string; channelId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const meta = this.meta.get(client);
    if (!meta?.userDehiveId) {
      return this.send(client, 'error', {
        message:
          'Please identify yourself first by sending an "identity" event.',
      });
    }

    const { serverId, categoryId, channelId } = data;
    if (
      !serverId ||
      !categoryId ||
      !channelId ||
      !Types.ObjectId.isValid(serverId) ||
      !Types.ObjectId.isValid(categoryId) ||
      !Types.ObjectId.isValid(channelId)
    ) {
      return this.send(client, 'error', {
        message:
          'Invalid payload. serverId, categoryId, and channelId are required and must be valid ObjectIds.',
      });
    }

    try {
      const isMember = await this.userDehiveServerModel.findOne({
        user_dehive_id: new Types.ObjectId(meta.userDehiveId),
        server_id: new Types.ObjectId(serverId),
      });

      if (!isMember) {
        return this.send(client, 'error', {
          message: 'Access denied. You are not a member of this server.',
        });
      }

      const channel = await this.channelModel.findById(channelId);
      if (!channel || channel.category_id.toString() !== categoryId) {
        return this.send(client, 'error', {
          message:
            'Channel not found or does not belong to the specified category.',
        });
      }

      const category = await this.categoryModel.findById(categoryId);
      if (!category || category.server_id.toString() !== serverId) {
        return this.send(client, 'error', {
          message:
            'Category not found or does not belong to the specified server.',
        });
      }

      const conversation = await this.channelConversationModel.findOneAndUpdate(
        { channelId: new Types.ObjectId(channelId) },
        { $setOnInsert: { channel_id: new Types.ObjectId(channelId) } },
        { upsert: true, new: true, runValidators: true },
      );

      const conversationId = String((conversation as any)._id);
      await client.join(conversationId);

      this.send(client, 'joinedChannel', {
        conversationId,
        message: 'Joined channel room successfully',
      });
    } catch (error) {
      console.error('[WebSocket] Error handling joinChannel:', error);
      this.send(client, 'error', {
        message: 'Failed to join channel.',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  @SubscribeMessage('joinConversation')
  handleJoinConversation(
    @MessageBody()
    payload: string | { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const meta = this.meta.get(client);
    if (!meta?.userDehiveId) {
      return this.send(client, 'error', {
        message:
          'Please identify yourself first by sending an "identity" event.',
      });
    }
    let conversationId = '';
    if (typeof payload === 'string') {
      conversationId = payload;
    } else if (payload && typeof payload === 'object') {
      conversationId = payload.conversationId;
    }
    if (!Types.ObjectId.isValid(conversationId)) {
      return this.send(client, 'error', {
        message: 'Invalid conversationId.',
      });
    }

    console.log(
      `[WebSocket] User ${meta.userDehiveId} joined conversation room: ${conversationId}`,
    );
    void client.join(conversationId);
    this.send(client, 'joinedConversation', {
      conversationId,
      message: `You have successfully joined conversation ${conversationId}`,
    });
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @MessageBody() data: CreateMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    const meta = this.meta.get(client);
    if (!meta?.userDehiveId) {
      return this.send(client, 'error', {
        message: 'Please identify yourself before sending a message.',
      });
    }

    try {
      if (!data || typeof data !== 'object') {
        return this.send(client, 'error', {
          message: 'Invalid payload.',
        });
      }
      const convId = (data as { conversationId?: string }).conversationId;
      if (!convId || !Types.ObjectId.isValid(convId)) {
        return this.send(client, 'error', {
          message: 'Invalid conversationId.',
        });
      }
      if (typeof (data as { content?: unknown }).content !== 'string') {
        return this.send(client, 'error', {
          message: 'Content must be a string (0-2000 chars).',
        });
      }
      if (String(data.content ?? '').length > 2000) {
        return this.send(client, 'error', {
          message: 'Content must not exceed 2000 characters.',
        });
      }
      if (!Array.isArray(data.uploadIds)) {
        return this.send(client, 'error', {
          message: 'uploadIds is required and must be an array',
        });
      }
      if (data.uploadIds.length > 0) {
        const allValid = data.uploadIds.every((id: unknown) => {
          return typeof id === 'string' && Types.ObjectId.isValid(id);
        });
        if (!allValid) {
          return this.send(client, 'error', {
            message: 'One or more uploadIds are invalid',
          });
        }
      }

      console.log(
        `[WebSocket] Received message from User ${meta.userDehiveId} for conversation ${convId}`,
      );
      const savedMessage = await this.messagingService.createMessage(
        data,
        meta.userDehiveId,
      );

      const populatedMessage = await savedMessage.populate<{
        senderId: UserDehiveDocument;
      }>({
        path: 'senderId',
        model: 'UserDehive',
        populate: {
          path: 'user_id',
          model: 'User',
          select: 'username',
        },
      });

      const messageToBroadcast = {
        _id: populatedMessage._id,
        sender: {
          dehive_id: populatedMessage.senderId._id,
          username: 'User',
        },
        content: populatedMessage.content,
        attachments: (
          populatedMessage as unknown as { attachments?: unknown[] }
        ).attachments,
        conversationId: (
          (populatedMessage as any).conversationId as Types.ObjectId
        )?.toString?.(),
        createdAt: (populatedMessage as any).createdAt,
        isEdited: populatedMessage.isEdited,
      };

      this.server
        .to(String(data.conversationId))
        .emit('newMessage', messageToBroadcast);
    } catch (error: unknown) {
      console.error('[WebSocket] Error handling message:', error);
      this.send(client, 'error', {
        message: 'Failed to send message.',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  @SubscribeMessage('editMessage')
  async handleEditMessage(
    @MessageBody()
    data: { messageId: string; content: string },
    @ConnectedSocket() client: Socket,
  ) {
    const meta = this.meta.get(client);
    if (!meta?.userDehiveId) {
      return this.send(client, 'error', {
        message: 'Please identify yourself before editing.',
      });
    }
    try {
      const updated = await this.messagingService.editMessage(
        data.messageId,
        meta.userDehiveId,
        data.content,
      );
      const payload = {
        _id: updated._id,
        content: updated.content,
        isEdited: true,
        editedAt: (updated as unknown as { editedAt?: Date }).editedAt,
        conversationId: (
          updated.conversationId as unknown as Types.ObjectId
        ).toString(),
      };
      this.server
        .to(String(payload.conversationId))
        .emit('messageEdited', payload);
    } catch (error: unknown) {
      this.send(client, 'error', {
        message: 'Failed to edit message.',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  @SubscribeMessage('deleteMessage')
  async handleDeleteMessage(
    @MessageBody()
    data: { messageId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const meta = this.meta.get(client);
    if (!meta?.userDehiveId) {
      return this.send(client, 'error', {
        message: 'Please identify yourself before deleting.',
      });
    }
    try {
      const updated = await this.messagingService.deleteMessage(
        data.messageId,
        meta.userDehiveId,
      );
      const payload = {
        _id: updated._id,
        isDeleted: true,
        conversationId: (
          updated.conversationId as unknown as Types.ObjectId
        ).toString(),
      };
      this.server
        .to(String(payload.conversationId))
        .emit('messageDeleted', payload);
    } catch (error: unknown) {
      this.send(client, 'error', {
        message: 'Failed to delete message.',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
