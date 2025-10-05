import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { HttpService } from '@nestjs/axios';
import { Server, ServerDocument } from '../schemas/server.schema';
import {
  UserDehive,
  UserDehiveDocument,
} from '../../user-dehive-server/schemas/user-dehive.schema';
import {
  UserDehiveServer,
  UserDehiveServerDocument,
} from '../../user-dehive-server/schemas/user-dehive-server.schema';
import { Category, CategoryDocument } from '../schemas/category.schema';
import { Channel, ChannelDocument } from '../schemas/channel.schema';
import { CreateServerDto } from '../dto/create-server.dto';
import { UpdateServerDto } from '../dto/update-server.dto';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { CreateChannelDto } from '../dto/create-channel.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { UpdateChannelDto } from '../dto/update-channel.dto';
import {
  ChannelMessage,
  ChannelMessageDocument,
} from '../schemas/channel-message.schema';
import { ServerRole } from '../../user-dehive-server/enum/enum';

@Injectable()
export class ServerService {
  constructor(
    @InjectModel(Server.name)
    private readonly serverModel: Model<ServerDocument>,
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
    @InjectModel(Channel.name)
    private readonly channelModel: Model<ChannelDocument>,
    @InjectModel(UserDehiveServer.name)
    private readonly userDehiveServerModel: Model<UserDehiveServerDocument>,
    @InjectModel(UserDehive.name)
    private readonly userDehiveModel: Model<UserDehiveDocument>,
    @InjectModel(ChannelMessage.name)
    private readonly channelMessageModel: Model<ChannelMessageDocument>,
    private readonly httpService: HttpService,
  ) {}

  async createServer(
    createServerDto: CreateServerDto,
    ownerBaseId: string,
  ): Promise<Server> {
    console.log('🚀 [CREATE SERVER] Starting with ownerBaseId:', ownerBaseId);

    if (!ownerBaseId) {
      throw new BadRequestException('Owner ID is required');
    }

    const ownerDehiveId = ownerBaseId; // user_dehive_id = user_id from Decode

    console.log('🔍 [CREATE SERVER] ownerDehiveId:', ownerDehiveId);
    const session = await this.serverModel.db.startSession();
    session.startTransaction();
    try {
      const newServerData = {
        ...createServerDto,
        owner_id: ownerBaseId, // Use ownerBaseId directly as string (same as Auth service _id)
        member_count: 1,
        is_private: false,
        tags: [],
      };

      const createdServers = await this.serverModel.create([newServerData], {
        session,
      });
      const newServer = createdServers[0];
      const newMembership = new this.userDehiveServerModel({
        user_dehive_id: ownerDehiveId,
        server_id: newServer._id,
        role: ServerRole.OWNER,
      });
      await newMembership.save({ session });
      // Update or create UserDehive profile
      await this.userDehiveModel.findByIdAndUpdate(
        ownerDehiveId,
        {
          $inc: { server_count: 1 },
          $setOnInsert: {
            dehive_role: 'USER',
            status: 'ACTIVE',
            bio: '',
            banner_color: null,
            is_banned: false,
            banned_by_servers: [],
          },
        },
        {
          session,
          upsert: true,
        },
      );
      await session.commitTransaction();
      return newServer;
    } catch (error) {
      await session.abortTransaction();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
      throw new BadRequestException('Could not create server.', error.message);
    } finally {
      void session.endSession();
    }
  }

  async findAllServers(actorBaseId: string): Promise<Server[]> {
    // 1. Ensure UserDehive profile exists (auto-create if needed)
    const actorDehiveId = actorBaseId; // user_dehive_id = user_id from Decode
    const memberships = await this.userDehiveServerModel
      .find({ user_dehive_id: actorDehiveId })
      .select('server_id')
      .lean();
    const serverIds = memberships.map((m) => m.server_id);
    return this.serverModel.find({ _id: { $in: serverIds } }).exec();
  }

  async findServerById(id: string): Promise<ServerDocument> {
    const server = await this.serverModel.findById(id).exec();
    if (!server) {
      throw new NotFoundException(`Server with ID "${id}" not found`);
    }
    return server;
  }

  async updateServer(
    id: string,
    updateServerDto: UpdateServerDto,
    actorId: string,
  ): Promise<Server> {
    const server = await this.findServerById(id);
    if (server.owner_id.toString() !== actorId) {
      throw new ForbiddenException(
        'You do not have permission to edit this server.',
      );
    }
    const updatedServer = await this.serverModel
      .findByIdAndUpdate(id, updateServerDto, { new: true })
      .exec();
    if (!updatedServer) {
      throw new NotFoundException(`Server with ID "${id}" not found`);
    }
    return updatedServer;
  }

  async removeServer(
    id: string,
    actorId: string,
  ): Promise<{ deleted: boolean }> {
    const server = await this.findServerById(id);
    if (server.owner_id.toString() !== actorId) {
      throw new ForbiddenException(
        'You do not have permission to delete this server.',
      );
    }
    const session = await this.serverModel.db.startSession();
    session.startTransaction();
    try {
      const serverId = new Types.ObjectId(id);
      const members = await this.userDehiveServerModel
        .find({ server_id: serverId })
        .select('user_dehive_id')
        .session(session);
      const memberIds = members.map((m) => m.user_dehive_id);

      await this.serverModel.findByIdAndDelete(serverId, { session });
      const categories = await this.categoryModel
        .find({ server_id: serverId })
        .select('_id')
        .session(session);
      const categoryIds = categories.map((c) => c._id);
      if (categoryIds.length > 0) {
        await this.channelModel.deleteMany(
          { category_id: { $in: categoryIds } },
          { session },
        );
      }
      await this.categoryModel.deleteMany({ server_id: serverId }, { session });
      await this.userDehiveServerModel.deleteMany(
        { server_id: serverId },
        { session },
      );
      if (memberIds.length > 0) {
        await this.userDehiveModel.updateMany(
          { _id: { $in: memberIds } },
          { $inc: { server_count: -1 } },
          { session },
        );
      }

      await session.commitTransaction();
      return { deleted: true };
    } catch (error) {
      await session.abortTransaction();
      throw new BadRequestException(
        'Could not delete server and its related data.',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
        error.message,
      );
    } finally {
      void session.endSession();
    }
  }

  async createCategory(
    serverId: string,
    actorId: string,
    createCategoryDto: CreateCategoryDto,
  ): Promise<Category> {
    const server = await this.findServerById(serverId);
    if (server.owner_id.toString() !== actorId) {
      throw new ForbiddenException(
        'Only the server owner can create categories.',
      );
    }

    // Get the current highest position in this server
    const lastCategory = await this.categoryModel
      .findOne({ server_id: server._id })
      .sort({ position: -1 })
      .exec();

    const nextPosition = lastCategory ? lastCategory.position + 1 : 0;

    const newCategory = new this.categoryModel({
      ...createCategoryDto,
      server_id: server._id,
      position: nextPosition,
    });
    return newCategory.save();
  }

  async findAllCategoriesInServer(serverId: string) {
    return this.categoryModel.aggregate([
      {
        $match: {
          server_id: new Types.ObjectId(serverId),
        },
      },
      {
        $sort: {
          position: 1,
        },
      },
      {
        $lookup: {
          from: 'channel',
          localField: '_id',
          foreignField: 'category_id',
          as: 'channels',
        },
      },
      {
        $addFields: {
          channels: {
            $sortArray: {
              input: '$channels',
              sortBy: { position: 1 }
            }
          }
        }
      }
    ]);
  }

  async updateCategory(
    categoryId: string,
    actorId: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    const category = await this.categoryModel.findById(categoryId);
    if (!category) {
      throw new NotFoundException(
        `Category with ID "${categoryId}" not found.`,
      );
    }

    const server = await this.findServerById(category.server_id.toString());
    if (server.owner_id.toString() !== actorId) {
      throw new ForbiddenException(
        'You do not have permission to edit this category.',
      );
    }

    // Handle position update logic
    if (updateCategoryDto.position !== undefined) {
      const newPosition = updateCategoryDto.position;
      const serverId = category.server_id;

      // Get all categories in the same server, sorted by position
      const categoriesInServer = await this.categoryModel
        .find({ server_id: serverId })
        .sort({ position: 1 })
        .exec();

      // Remove the current category from the list
      const otherCategories = categoriesInServer.filter(
        (c: any) => c._id.toString() !== categoryId
      );

      // Insert the category at the new position
      otherCategories.splice(newPosition, 0, category);

      // Update positions for all categories
      for (let i = 0; i < otherCategories.length; i++) {
        await this.categoryModel.findByIdAndUpdate(
          otherCategories[i]._id,
          { position: i }
        );
      }
    }

    Object.assign(category, updateCategoryDto);
    return category.save();
  }

  async removeCategory(
    categoryId: string,
    actorId: string,
  ): Promise<{ deleted: boolean }> {
    const categoryObjectId = new Types.ObjectId(categoryId);

    const category = await this.categoryModel.findById(categoryObjectId);
    if (!category) {
      throw new NotFoundException(
        `Category with ID "${categoryId}" not found.`,
      );
    }

    const server = await this.findServerById(category.server_id.toString());
    if (server.owner_id.toString() !== actorId) {
      throw new ForbiddenException(
        'You do not have permission to delete this category.',
      );
    }

    const session = await this.categoryModel.db.startSession();
    session.startTransaction();
    try {
      await this.channelModel.deleteMany(
        { category_id: categoryObjectId },
        { session },
      );

      await this.categoryModel.findByIdAndDelete(categoryObjectId, { session });
      await session.commitTransaction();
      return { deleted: true };
    } catch (error) {
      await session.abortTransaction();
      throw new BadRequestException(
        'Could not delete category and its channels.',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
        error.message,
      );
    } finally {
      void session.endSession();
    }
  }

  async createChannel(
    serverId: string,
    categoryId: string,
    actorId: string,
    createChannelDto: CreateChannelDto,
  ): Promise<Channel> {
    console.log('🎯 [CREATE CHANNEL] Starting channel creation...');
    console.log('🎯 [CREATE CHANNEL] serverId:', serverId);
    console.log('🎯 [CREATE CHANNEL] categoryId:', categoryId);
    console.log('🎯 [CREATE CHANNEL] actorId:', actorId);
    console.log('🎯 [CREATE CHANNEL] actorId type:', typeof actorId);

    const serverObjectId = new Types.ObjectId(serverId);
    const categoryObjectId = new Types.ObjectId(categoryId);
    const actorObjectId = new Types.ObjectId(actorId);

    console.log('🎯 [CREATE CHANNEL] serverObjectId:', serverObjectId);
    console.log('🎯 [CREATE CHANNEL] categoryObjectId:', categoryObjectId);
    console.log('🎯 [CREATE CHANNEL] actorObjectId:', actorObjectId);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [server, category, actorMembership] = await Promise.all([
      this.findServerById(serverId),
      this.categoryModel.findById(categoryObjectId).lean(),
      this.userDehiveServerModel
        .findOne({
          server_id: serverObjectId,
          user_dehive_id: actorObjectId,
        })
        .lean(),
    ]);

    console.log('🎯 [CREATE CHANNEL] server:', server);
    console.log('🎯 [CREATE CHANNEL] server.owner_id:', server.owner_id);
    console.log('🎯 [CREATE CHANNEL] server.owner_id type:', typeof server.owner_id);
    console.log('🎯 [CREATE CHANNEL] category:', category);
    console.log('🎯 [CREATE CHANNEL] actorMembership:', actorMembership);

    if (!category)
      throw new NotFoundException(`Category with ID ${categoryId} not found.`);
    if (category.server_id.toString() !== serverId)
      throw new BadRequestException('Category does not belong to this server.');

    // Check if actor is server owner
    const isOwner = server.owner_id.toString() === actorId;
    console.log('🎯 [CREATE CHANNEL] isOwner:', isOwner);
    console.log('🎯 [CREATE CHANNEL] server.owner_id.toString():', server.owner_id.toString());
    console.log('🎯 [CREATE CHANNEL] actorId:', actorId);
    console.log('🎯 [CREATE CHANNEL] owner comparison:', server.owner_id.toString() === actorId);

    const hasPermission =
      isOwner ||
      (actorMembership &&
        (actorMembership.role === ServerRole.OWNER ||
          actorMembership.role === ServerRole.MODERATOR));

    console.log('🎯 [CREATE CHANNEL] hasPermission:', hasPermission);
    console.log('🎯 [CREATE CHANNEL] actorMembership?.role:', actorMembership?.role);

    if (!hasPermission) {
      console.log('❌ [CREATE CHANNEL] Permission denied!');
      console.log('❌ [CREATE CHANNEL] isOwner:', isOwner);
      console.log('❌ [CREATE CHANNEL] actorMembership exists:', !!actorMembership);
      console.log('❌ [CREATE CHANNEL] actorMembership role:', actorMembership?.role);
      throw new ForbiddenException(
        'Only server owners and moderators can create channels.',
      );
    }

    // Get the current highest position in this category
    const lastChannel = await this.channelModel
      .findOne({ category_id: categoryObjectId })
      .sort({ position: -1 })
      .exec();

    const nextPosition = lastChannel ? lastChannel.position + 1 : 0;

    const newChannel = new this.channelModel({
      ...createChannelDto,
      category_id: categoryObjectId,
      position: nextPosition,
    });
    return newChannel.save();
  }

  async findChannelById(channelId: string): Promise<ChannelDocument> {
    const channel = await this.channelModel.findById(channelId).exec();
    if (!channel) {
      throw new NotFoundException(`Channel with ID "${channelId}" not found.`);
    }
    return channel;
  }

  async updateChannel(
    channelId: string,
    actorId: string,
    updateChannelDto: UpdateChannelDto,
  ): Promise<Channel> {
    console.log('🎯 [UPDATE CHANNEL] Starting channel update...');
    console.log('🎯 [UPDATE CHANNEL] channelId:', channelId);
    console.log('🎯 [UPDATE CHANNEL] actorId:', actorId);

    const channel = await this.findChannelById(channelId);
    const category = await this.categoryModel
      .findById(channel.category_id)
      .lean();
    if (!category)
      throw new NotFoundException(
        'Category containing this channel not found.',
      );

    // Get server info to check owner
    const server = await this.findServerById(category.server_id.toString());
    console.log('🎯 [UPDATE CHANNEL] server:', server);
    console.log('🎯 [UPDATE CHANNEL] server.owner_id:', server.owner_id);

    // Check if actor is server owner
    const isOwner = server.owner_id.toString() === actorId;
    console.log('🎯 [UPDATE CHANNEL] isOwner:', isOwner);

    const actorMembership = await this.userDehiveServerModel
      .findOne({
        server_id: category.server_id,
        user_dehive_id: new Types.ObjectId(actorId),
      })
      .lean();

    console.log('🎯 [UPDATE CHANNEL] actorMembership:', actorMembership);

    const hasPermission =
      isOwner ||
      (actorMembership &&
        (actorMembership.role === ServerRole.OWNER ||
          actorMembership.role === ServerRole.MODERATOR));

    console.log('🎯 [UPDATE CHANNEL] hasPermission:', hasPermission);

    if (!hasPermission) {
      console.log('❌ [UPDATE CHANNEL] Permission denied!');
      console.log('❌ [UPDATE CHANNEL] isOwner:', isOwner);
      console.log('❌ [UPDATE CHANNEL] actorMembership exists:', !!actorMembership);
      console.log('❌ [UPDATE CHANNEL] actorMembership role:', actorMembership?.role);
      throw new ForbiddenException(
        'You do not have permission to edit channels in this server.',
      );
    }

    if (updateChannelDto.category_id) {
      const newCategory = await this.categoryModel.findById(
        updateChannelDto.category_id,
      );
      if (
        !newCategory ||
        newCategory.server_id.toString() !== category.server_id.toString()
      ) {
        throw new BadRequestException(
          'The new category is invalid or does not belong to the same server.',
        );
      }
    }

    // Handle position update logic
    if (updateChannelDto.position !== undefined) {
      const newPosition = updateChannelDto.position;
      const currentPosition = channel.position;
      const categoryId = updateChannelDto.category_id || channel.category_id;

      // Get all channels in the same category, sorted by position
      const channelsInCategory = await this.channelModel
        .find({ category_id: categoryId })
        .sort({ position: 1 })
        .exec();

      // Remove the current channel from the list
      const otherChannels = channelsInCategory.filter(
        (c: any) => c._id.toString() !== channelId
      );

      // Insert the channel at the new position
      otherChannels.splice(newPosition, 0, channel as any);

      // Update positions for all channels
      for (let i = 0; i < otherChannels.length; i++) {
        await this.channelModel.findByIdAndUpdate(
          otherChannels[i]._id,
          { position: i }
        );
      }
    }

    const updatedChannel = await this.channelModel
      .findByIdAndUpdate(channelId, { $set: updateChannelDto }, { new: true })
      .exec();

    if (!updatedChannel) {
      throw new NotFoundException(
        `Failed to update channel with ID "${channelId}".`,
      );
    }

    return updatedChannel;
  }

  async removeChannel(
    channelId: string,
    actorId: string,
  ): Promise<{ deleted: boolean }> {
    console.log('🎯 [DELETE CHANNEL] Starting channel deletion...');
    console.log('🎯 [DELETE CHANNEL] channelId:', channelId);
    console.log('🎯 [DELETE CHANNEL] actorId:', actorId);

    const channelObjectId = new Types.ObjectId(channelId);
    const channel = await this.findChannelById(channelId);

    const category = await this.categoryModel
      .findById(channel.category_id)
      .lean();
    if (!category)
      throw new NotFoundException(
        'Category containing this channel not found.',
      );

    // Get server info to check owner
    const server = await this.findServerById(category.server_id.toString());
    console.log('🎯 [DELETE CHANNEL] server:', server);
    console.log('🎯 [DELETE CHANNEL] server.owner_id:', server.owner_id);

    // Check if actor is server owner
    const isOwner = server.owner_id.toString() === actorId;
    console.log('🎯 [DELETE CHANNEL] isOwner:', isOwner);

    const actorMembership = await this.userDehiveServerModel
      .findOne({
        server_id: category.server_id,
        user_dehive_id: new Types.ObjectId(actorId),
      })
      .lean();

    console.log('🎯 [DELETE CHANNEL] actorMembership:', actorMembership);

    const hasPermission =
      isOwner ||
      (actorMembership &&
        (actorMembership.role === ServerRole.OWNER ||
          actorMembership.role === ServerRole.MODERATOR));

    console.log('🎯 [DELETE CHANNEL] hasPermission:', hasPermission);

    if (!hasPermission) {
      console.log('❌ [DELETE CHANNEL] Permission denied!');
      console.log('❌ [DELETE CHANNEL] isOwner:', isOwner);
      console.log('❌ [DELETE CHANNEL] actorMembership exists:', !!actorMembership);
      console.log('❌ [DELETE CHANNEL] actorMembership role:', actorMembership?.role);
      throw new ForbiddenException(
        'You do not have permission to delete channels in this server.',
      );
    }

    const session = await this.channelModel.db.startSession();
    session.startTransaction();
    try {
      await this.channelMessageModel.deleteMany(
        { channel_id: channelObjectId },
        { session },
      );

      await this.channelModel.findByIdAndDelete(channelObjectId, { session });
      await session.commitTransaction();
      return { deleted: true };
    } catch (error) {
      await session.abortTransaction();
      throw new BadRequestException(
        'Could not delete channel and its messages.',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
        error.message,
      );
    } finally {
      void session.endSession();
    }
  }
}
