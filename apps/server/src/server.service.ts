import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
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

  // Helper method to fetch user profile from Auth service
  private async fetchUserProfileFromAuth(userId: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`http://localhost:4006/auth/profile/${userId}`),
      );
      return response.data;
    } catch (error) {
      console.error('Failed to fetch user profile from Auth service:', error);
      return null;
    }
  }

  // Helper method to auto-create UserDehive profile
  private async ensureUserDehiveProfile(userId: string) {
    console.log('🔍 [ENSURE USER PROFILE] userId:', userId);

    // 1. Check if UserDehive exists using userId as _id or user_id
    let userDehiveProfile = await this.userDehiveModel
      .findOne({ $or: [{ _id: userId }, { user_id: userId }] })
      .lean();

    console.log(
      '🔍 [ENSURE USER PROFILE] Existing profile:',
      userDehiveProfile,
    );

    if (!userDehiveProfile) {
      console.log('🔍 [ENSURE USER PROFILE] Creating new profile...');
      const newUserDehive = new this.userDehiveModel({
        _id: userId, // Set _id = userId from Decode (user_dehive_id = user_id)
        user_id: userId, // Also keep user_id for reference
        bio: '',
        banner_color: null,
        server_count: 0,
        status: 'offline',
        last_login: new Date(),
      });

      const savedUserDehive = await newUserDehive.save();
      console.log(
        '✅ [ENSURE USER PROFILE] Profile created:',
        savedUserDehive.toObject(),
      );
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      userDehiveProfile = savedUserDehive.toObject() as any;
    } else {
      console.log('✅ [ENSURE USER PROFILE] Using existing profile');
    }

    return userDehiveProfile;
  }

  async createServer(
    createServerDto: CreateServerDto,
    ownerBaseId: string,
  ): Promise<Server> {
    console.log('🚀 [CREATE SERVER] Starting with ownerBaseId:', ownerBaseId);

    if (!ownerBaseId) {
      throw new BadRequestException('Owner ID is required');
    }

    // 1. Ensure UserDehive profile exists (auto-create if needed)
    const ownerDehiveProfile = await this.ensureUserDehiveProfile(ownerBaseId);
    const ownerDehiveId = ownerBaseId; // user_dehive_id = user_id from Decode

    console.log('🔍 [CREATE SERVER] ownerDehiveProfile:', ownerDehiveProfile);
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
        user_id: ownerBaseId, // Use ownerBaseId directly as string (same as Auth service _id)
        user_dehive_id: ownerDehiveId,
        server_id: newServer._id,
        role: ServerRole.OWNER,
      });
      await newMembership.save({ session });
      await this.userDehiveModel.findByIdAndUpdate(
        ownerDehiveId,
        { $inc: { server_count: 1 } },
        {
          session,
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
    const newCategory = new this.categoryModel({
      ...createCategoryDto,
      server_id: server._id,
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
          from: 'channels',
          localField: '_id',
          foreignField: 'category_id',
          as: 'channels',
        },
      },
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
    const serverObjectId = new Types.ObjectId(serverId);
    const categoryObjectId = new Types.ObjectId(categoryId);
    const actorObjectId = new Types.ObjectId(actorId);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [server, category, actorMembership] = await Promise.all([
      this.findServerById(serverId),
      this.categoryModel.findById(categoryObjectId).lean(),
      this.userDehiveServerModel
        .findOne({
          server_id: serverObjectId,
          user_id: actorObjectId,
        })
        .lean(),
    ]);

    if (!category)
      throw new NotFoundException(`Category with ID ${categoryId} not found.`);
    if (category.server_id.toString() !== serverId)
      throw new BadRequestException('Category does not belong to this server.');
    const hasPermission =
      actorMembership &&
      (actorMembership.role === ServerRole.OWNER ||
        actorMembership.role === ServerRole.MODERATOR);
    if (!hasPermission) {
      throw new ForbiddenException(
        'Only server owners and moderators can create channels.',
      );
    }

    const newChannel = new this.channelModel({
      ...createChannelDto,
      category_id: categoryObjectId,
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
    const channel = await this.findChannelById(channelId);
    const category = await this.categoryModel
      .findById(channel.category_id)
      .lean();
    if (!category)
      throw new NotFoundException(
        'Category containing this channel not found.',
      );

    const actorMembership = await this.userDehiveServerModel
      .findOne({
        server_id: category.server_id,
        user_id: new Types.ObjectId(actorId),
      })
      .lean();

    const hasPermission =
      actorMembership &&
      (actorMembership.role === ServerRole.OWNER ||
        actorMembership.role === ServerRole.MODERATOR);
    if (!hasPermission) {
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
    const channelObjectId = new Types.ObjectId(channelId);
    const channel = await this.findChannelById(channelId);

    const category = await this.categoryModel
      .findById(channel.category_id)
      .lean();
    if (!category)
      throw new NotFoundException(
        'Category containing this channel not found.',
      );

    const actorMembership = await this.userDehiveServerModel
      .findOne({
        server_id: category.server_id,
        user_id: new Types.ObjectId(actorId),
      })
      .lean();

    const hasPermission =
      actorMembership &&
      (actorMembership.role === ServerRole.OWNER ||
        actorMembership.role === ServerRole.MODERATOR);
    if (!hasPermission) {
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
