import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { HttpService } from "@nestjs/axios";
import { Server, ServerDocument } from "../../schemas/server.schema";
import {
  UserDehive,
  UserDehiveDocument,
} from "../../../user-dehive-server/schemas/user-dehive.schema";
import {
  UserDehiveServer,
  UserDehiveServerDocument,
} from "../../../user-dehive-server/schemas/user-dehive-server.schema";
import { Category, CategoryDocument } from "../../schemas/category.schema";
import { Channel, ChannelDocument } from "../../schemas/channel.schema";
import { CreateServerDto } from "../../dto/create-server.dto";
import { UpdateServerDto } from "../../dto/update-server.dto";
import { CreateCategoryDto } from "../../dto/create-category.dto";
import { CreateChannelDto } from "../../dto/create-channel.dto";
import { UpdateCategoryDto } from "../../dto/update-category.dto";
import { UpdateChannelDto } from "../../dto/update-channel.dto";
import {
  ChannelMessage,
  ChannelMessageDocument,
} from "../../schemas/channel-message.schema";
import { ServerRole } from "../../../user-dehive-server/enum/enum";
import { IPFSService } from "./ipfs.service";
import { UpdateNftGatingDto } from "../../dto/update-nft-gating.dto";
import { NftVerificationService } from "./nft-verification.service";
import { NetworkMappingService } from "./network-mapping.service";

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
    private readonly ipfsService: IPFSService,
    private readonly nftVerificationService: NftVerificationService,
    private readonly networkMapping: NetworkMappingService,
  ) {
    // Constructor body can be empty or used for initialization
  }

  async createServer(
    createServerDto: CreateServerDto,
    ownerBaseId: string,
    avatar?: Express.Multer.File,
  ): Promise<Server> {
    console.log("🚀 [CREATE SERVER] Starting with ownerBaseId:", ownerBaseId);

    if (!ownerBaseId) {
      throw new BadRequestException("Owner ID is required");
    }

    const ownerDehiveId = ownerBaseId;

    let avatarHash: string | undefined;
    if (avatar) {
      console.log(
        `📸 [CREATE SERVER] Uploading avatar to IPFS: ${avatar.originalname}`,
      );
      const buffer: Buffer = Buffer.isBuffer(avatar.buffer)
        ? avatar.buffer
        : Buffer.from("");

      const ipfsResult = await this.ipfsService.uploadFile(
        buffer,
        avatar.originalname,
      );
      if (ipfsResult) {
        avatarHash = `ipfs://${ipfsResult.hash}`;
        console.log(
          `✅ [CREATE SERVER] Avatar uploaded to IPFS: ${avatarHash}`,
        );
      } else {
        console.warn(
          "⚠️ [CREATE SERVER] IPFS upload failed, server will be created without avatar",
        );
      }
    }

    console.log("🔍 [CREATE SERVER] ownerDehiveId:", ownerDehiveId);
    const session = await this.serverModel.db.startSession();
    session.startTransaction();
    try {
      const newServerData = {
        ...createServerDto,
        owner_id: ownerBaseId,
        avatar_hash: avatarHash,
        member_count: 1,
        is_private: false,
        tags: createServerDto.tags || [],
      };

      const createdServers = await this.serverModel.create([newServerData], {
        session,
      });
      let newServer = createdServers[0];
      console.log("🔍 [CREATE SERVER] newServerData:", newServerData);
      console.log("🔍 [CREATE SERVER] newServer after create:", newServer);

      if (avatarHash) {
        const updatedServer = await this.serverModel
          .findByIdAndUpdate(
            newServer._id,
            { $set: { avatar_hash: avatarHash } },
            { new: true, session, strict: false },
          )
          .exec();
        if (updatedServer) {
          newServer = updatedServer;
        }
        console.log("🔍 [CREATE SERVER] newServer after update:", newServer);
        console.log(
          "🔍 [CREATE SERVER] avatar_hash in update:",
          updatedServer?.avatar_hash,
        );
      }

      console.log(
        "🔍 [CREATE SERVER] newServer.avatar_hash:",
        newServer.avatar_hash,
      );

      const newMembership = new this.userDehiveServerModel({
        user_dehive_id: ownerDehiveId,
        server_id: newServer._id,
        role: ServerRole.OWNER,
      });
      await newMembership.save({ session });
      await this.userDehiveModel.findByIdAndUpdate(
        ownerDehiveId,
        {
          $inc: { server_count: 1 },
          $setOnInsert: {
            dehive_role: "USER",
            status: "ACTIVE",
            bio: "",
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

      console.log("📤 [CREATE SERVER] Returning server:", newServer);
      console.log("📤 [CREATE SERVER] Server toObject:", newServer.toObject());

      return newServer;
    } catch (error) {
      await session.abortTransaction();

      throw new BadRequestException("Could not create server.", error.message);
    } finally {
      void session.endSession();
    }
  }

  async findAllServers(actorBaseId: string): Promise<Server[]> {
    const actorDehiveId = actorBaseId;
    const memberships = await this.userDehiveServerModel
      .find({ user_dehive_id: actorDehiveId })
      .select("server_id")
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
    avatar?: Express.Multer.File,
  ): Promise<Server> {
    const server = await this.findServerById(id);
    if (server.owner_id.toString() !== actorId) {
      throw new ForbiddenException(
        "You do not have permission to edit this server.",
      );
    }

    let avatarHash: string | undefined;
    if (avatar) {
      console.log(
        `📸 [UPDATE SERVER] Uploading avatar to IPFS: ${avatar.originalname}`,
      );
      const buffer: Buffer = Buffer.isBuffer(avatar.buffer)
        ? avatar.buffer
        : Buffer.from("");

      const ipfsResult = await this.ipfsService.uploadFile(
        buffer,
        avatar.originalname,
      );
      if (ipfsResult) {
        avatarHash = `ipfs://${ipfsResult.hash}`;
        console.log(
          `✅ [UPDATE SERVER] Avatar uploaded to IPFS: ${avatarHash}`,
        );
      } else {
        console.warn(
          "⚠️ [UPDATE SERVER] IPFS upload failed, avatar will not be updated",
        );
      }
    }

    const updateData = {
      ...updateServerDto,
      ...(avatarHash && { avatar_hash: avatarHash }),
    };

    console.log(`🔍 [UPDATE SERVER] updateData:`, updateData);

    const updatedServer = await this.serverModel
      .findByIdAndUpdate(id, { $set: updateData }, { new: true, strict: false })
      .exec();

    console.log(`🔍 [UPDATE SERVER] updatedServer:`, updatedServer);
    console.log(
      `🔍 [UPDATE SERVER] updatedServer.avatar_hash:`,
      updatedServer?.avatar_hash,
    );

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
        "You do not have permission to delete this server.",
      );
    }
    const session = await this.serverModel.db.startSession();
    session.startTransaction();
    try {
      const serverId = new Types.ObjectId(id);
      const members = await this.userDehiveServerModel
        .find({ server_id: serverId })
        .select("user_dehive_id")
        .session(session);
      const memberIds = members.map((m) => m.user_dehive_id);

      await this.serverModel.findByIdAndDelete(serverId, { session });
      const categories = await this.categoryModel
        .find({ server_id: serverId })
        .select("_id")
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
        "Could not delete server and its related data.",

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
        "Only the server owner can create categories.",
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
        $lookup: {
          from: "channel",
          localField: "_id",
          foreignField: "category_id",
          as: "channels",
        },
      },
    ]);
  }

  async findAllChannelsInServer(serverId: string) {
    const serverObjectId = new Types.ObjectId(serverId);

    // Verify server exists
    const server = await this.serverModel.findById(serverObjectId);
    if (!server) {
      throw new NotFoundException(`Server with ID ${serverId} not found.`);
    }

    // Get all categories in this server
    const categories = await this.categoryModel
      .find({ server_id: serverObjectId })
      .select("_id")
      .lean();

    const categoryIds = categories.map((cat) => cat._id);

    // Get all channels belonging to these categories with category info
    return this.channelModel.aggregate([
      {
        $match: {
          category_id: { $in: categoryIds },
        },
      },
      {
        $lookup: {
          from: "category",
          localField: "category_id",
          foreignField: "_id",
          as: "category",
        },
      },
      {
        $unwind: "$category",
      },
      {
        $project: {
          _id: 1,
          name: 1,
          type: 1,
          topic: 1,
          createdAt: 1,
          updatedAt: 1,
          category_id: 1,
          category_name: "$category.name",
        },
      },
      {
        $sort: { createdAt: 1 },
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
        "You do not have permission to edit this category.",
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
        "You do not have permission to delete this category.",
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
        "Could not delete category and its channels.",
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
    console.log("🎯 [CREATE CHANNEL] Starting channel creation...");
    console.log("🎯 [CREATE CHANNEL] serverId:", serverId);
    console.log("🎯 [CREATE CHANNEL] categoryId:", categoryId);
    console.log("🎯 [CREATE CHANNEL] actorId:", actorId);
    console.log("🎯 [CREATE CHANNEL] actorId type:", typeof actorId);

    const serverObjectId = new Types.ObjectId(serverId);
    const categoryObjectId = new Types.ObjectId(categoryId);

    console.log("🎯 [CREATE CHANNEL] serverObjectId:", serverObjectId);
    console.log("🎯 [CREATE CHANNEL] categoryObjectId:", categoryObjectId);

    const [server, category, actorMembership] = await Promise.all([
      this.findServerById(serverId),
      this.categoryModel.findById(categoryObjectId).lean(),
      this.userDehiveServerModel
        .findOne({
          server_id: serverObjectId,
          user_dehive_id: actorId,
        })
        .lean(),
    ]);

    console.log("🎯 [CREATE CHANNEL] server:", server);
    console.log("🎯 [CREATE CHANNEL] server.owner_id:", server.owner_id);
    console.log(
      "🎯 [CREATE CHANNEL] server.owner_id type:",
      typeof server.owner_id,
    );
    console.log("🎯 [CREATE CHANNEL] category:", category);
    console.log("🎯 [CREATE CHANNEL] actorMembership:", actorMembership);

    if (!category)
      throw new NotFoundException(`Category with ID ${categoryId} not found.`);
    if (category.server_id.toString() !== serverId)
      throw new BadRequestException("Category does not belong to this server.");

    const isOwner = server.owner_id.toString() === actorId;
    console.log("🎯 [CREATE CHANNEL] isOwner:", isOwner);
    console.log(
      "🎯 [CREATE CHANNEL] server.owner_id.toString():",
      server.owner_id.toString(),
    );
    console.log("🎯 [CREATE CHANNEL] actorId:", actorId);
    console.log(
      "🎯 [CREATE CHANNEL] owner comparison:",
      server.owner_id.toString() === actorId,
    );

    const hasPermission =
      isOwner ||
      (actorMembership &&
        (actorMembership.role === ServerRole.OWNER ||
          actorMembership.role === ServerRole.MODERATOR));

    console.log("🎯 [CREATE CHANNEL] hasPermission:", hasPermission);
    console.log(
      "🎯 [CREATE CHANNEL] actorMembership?.role:",
      actorMembership?.role,
    );

    if (!hasPermission) {
      console.log("❌ [CREATE CHANNEL] Permission denied!");
      console.log("❌ [CREATE CHANNEL] isOwner:", isOwner);
      console.log(
        "❌ [CREATE CHANNEL] actorMembership exists:",
        !!actorMembership,
      );
      console.log(
        "❌ [CREATE CHANNEL] actorMembership role:",
        actorMembership?.role,
      );
      throw new ForbiddenException(
        "Only server owners and moderators can create channels.",
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
    console.log("🎯 [UPDATE CHANNEL] Starting channel update...");
    console.log("🎯 [UPDATE CHANNEL] channelId:", channelId);
    console.log("🎯 [UPDATE CHANNEL] actorId:", actorId);

    const channel = await this.findChannelById(channelId);
    const category = await this.categoryModel
      .findById(channel.category_id)
      .lean();
    if (!category)
      throw new NotFoundException(
        "Category containing this channel not found.",
      );

    const server = await this.findServerById(category.server_id.toString());

    const isOwner = server.owner_id.toString() === actorId;

    const actorMembership = await this.userDehiveServerModel
      .findOne({
        server_id: category.server_id,
        user_dehive_id: actorId, // ✅ FIX: Use string, not ObjectId
      })
      .lean();

    const hasPermission =
      isOwner ||
      (actorMembership &&
        (actorMembership.role === ServerRole.OWNER ||
          actorMembership.role === ServerRole.MODERATOR));

    if (!hasPermission) {
      throw new ForbiddenException(
        "You do not have permission to edit channels in this server.",
      );
    }

    const updateData: Record<string, unknown> = { ...updateChannelDto };

    const updatedChannel = await this.channelModel
      .findByIdAndUpdate(channelId, { $set: updateData }, { new: true })
      .exec();

    if (!updatedChannel) {
      throw new NotFoundException(
        `Failed to update channel with ID "${channelId}".`,
      );
    }

    return updatedChannel;
  }

  async moveChannel(
    channelId: string,
    actorId: string,
    moveChannelDto: { category_id: string },
  ): Promise<Channel> {
    console.log("🎯 [MOVE CHANNEL] Starting channel move...");
    console.log("🎯 [MOVE CHANNEL] channelId:", channelId);
    console.log("🎯 [MOVE CHANNEL] actorId:", actorId);
    console.log("🎯 [MOVE CHANNEL] newCategoryId:", moveChannelDto.category_id);

    const channel = await this.findChannelById(channelId);
    const currentCategory = await this.categoryModel
      .findById(channel.category_id)
      .lean();
    if (!currentCategory)
      throw new NotFoundException(
        "Category containing this channel not found.",
      );

    const server = await this.findServerById(
      currentCategory.server_id.toString(),
    );

    const isOwner = server.owner_id.toString() === actorId;

    const actorMembership = await this.userDehiveServerModel
      .findOne({
        server_id: currentCategory.server_id,
        user_dehive_id: actorId,
      })
      .lean();

    const hasPermission =
      isOwner ||
      (actorMembership &&
        (actorMembership.role === ServerRole.OWNER ||
          actorMembership.role === ServerRole.MODERATOR));

    if (!hasPermission) {
      throw new ForbiddenException(
        "You do not have permission to move channels in this server.",
      );
    }

    const newCategory = await this.categoryModel.findById(
      moveChannelDto.category_id,
    );

    if (!newCategory) {
      throw new NotFoundException(
        `Category with ID "${moveChannelDto.category_id}" not found.`,
      );
    }

    if (
      newCategory.server_id.toString() !== currentCategory.server_id.toString()
    ) {
      throw new BadRequestException(
        "The new category does not belong to the same server.",
      );
    }

    if (channel.category_id.toString() === moveChannelDto.category_id) {
      throw new BadRequestException(
        "Channel is already in the specified category.",
      );
    }

    const updatedChannel = await this.channelModel
      .findByIdAndUpdate(
        channelId,
        {
          $set: { category_id: new Types.ObjectId(moveChannelDto.category_id) },
        },
        { new: true },
      )
      .exec();

    if (!updatedChannel) {
      throw new NotFoundException(
        `Failed to move channel with ID "${channelId}".`,
      );
    }

    return updatedChannel;
  }

  async removeChannel(
    channelId: string,
    actorId: string,
  ): Promise<{ deleted: boolean }> {
    console.log("🎯 [DELETE CHANNEL] Starting channel deletion...");
    console.log("🎯 [DELETE CHANNEL] channelId:", channelId);
    console.log("🎯 [DELETE CHANNEL] actorId:", actorId);

    const channelObjectId = new Types.ObjectId(channelId);
    const channel = await this.findChannelById(channelId);

    const category = await this.categoryModel
      .findById(channel.category_id)
      .lean();
    if (!category)
      throw new NotFoundException(
        "Category containing this channel not found.",
      );

    const server = await this.findServerById(category.server_id.toString());
    console.log("🎯 [DELETE CHANNEL] server:", server);
    console.log("🎯 [DELETE CHANNEL] server.owner_id:", server.owner_id);

    const isOwner = server.owner_id.toString() === actorId;
    console.log("🎯 [DELETE CHANNEL] isOwner:", isOwner);

    const actorMembership = await this.userDehiveServerModel
      .findOne({
        server_id: category.server_id,
        user_dehive_id: actorId,
      })
      .lean();

    console.log("🎯 [DELETE CHANNEL] actorMembership:", actorMembership);

    const hasPermission =
      isOwner ||
      (actorMembership &&
        (actorMembership.role === ServerRole.OWNER ||
          actorMembership.role === ServerRole.MODERATOR));

    console.log("🎯 [DELETE CHANNEL] hasPermission:", hasPermission);

    if (!hasPermission) {
      console.log("❌ [DELETE CHANNEL] Permission denied!");
      console.log("❌ [DELETE CHANNEL] isOwner:", isOwner);
      console.log(
        "❌ [DELETE CHANNEL] actorMembership exists:",
        !!actorMembership,
      );
      console.log(
        "❌ [DELETE CHANNEL] actorMembership role:",
        actorMembership?.role,
      );
      throw new ForbiddenException(
        "You do not have permission to delete channels in this server.",
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
        "Could not delete channel and its messages.",

        error.message,
      );
    } finally {
      void session.endSession();
    }
  }

  async updateServerTags(
    serverId: string,
    tags: string[],
    actorId: string,
  ): Promise<Server> {
    const serverObjectId = new Types.ObjectId(serverId);

    const server = await this.serverModel.findById(serverObjectId);
    if (!server) {
      throw new NotFoundException("Server not found.");
    }

    const userServerRole = await this.userDehiveServerModel.findOne({
      server_id: serverObjectId,
      user_dehive_id: actorId,
      role: { $in: [ServerRole.OWNER, ServerRole.MODERATOR] },
    });

    if (!userServerRole) {
      throw new ForbiddenException(
        "You do not have permission to update server tags.",
      );
    }

    const updatedServer = await this.serverModel.findByIdAndUpdate(
      serverObjectId,
      { tags },
      { new: true },
    );

    if (!updatedServer) {
      throw new NotFoundException("Server not found after update.");
    }

    return updatedServer;
  }

  async updateNftGating(
    serverId: string,
    actorId: string,
    updateNftGatingDto: UpdateNftGatingDto,
  ): Promise<Server> {
    const serverObjectId = new Types.ObjectId(serverId);

    const server = await this.serverModel.findById(serverObjectId);
    if (!server) {
      throw new NotFoundException("Server not found.");
    }

    const userServerRole = await this.userDehiveServerModel.findOne({
      server_id: serverObjectId,
      user_dehive_id: actorId,
      role: ServerRole.OWNER,
    });

    if (!userServerRole) {
      throw new ForbiddenException(
        "Only server owner can update NFT gating configuration.",
      );
    }

    // ✅ DISABLE NFT GATING
    if (!updateNftGatingDto.enabled) {
      console.log(
        `🔓 [NFT GATING] Disabling NFT gating for server ${serverId}`,
      );

      const updatedServer = await this.serverModel.findByIdAndUpdate(
        serverObjectId,
        { $unset: { nft_gated: "" } },
        { new: true },
      );

      if (!updatedServer) {
        throw new NotFoundException("Server not found after update.");
      }

      return updatedServer;
    }

    // ✅ ENABLE NFT GATING (No contract verification)
    try {
      // Get network info and convert network name to chain_id
      const networkInfo = this.networkMapping.getNetworkInfo(
        updateNftGatingDto.network,
      );

      console.log(`🔒 [NFT GATING] Enabling NFT gating for server ${serverId}`);
      console.log(
        `   Network: ${networkInfo.name} (${updateNftGatingDto.network})`,
      );
      console.log(`   Chain ID: ${networkInfo.chainId}`);
      console.log(`   Contract: ${updateNftGatingDto.contract_address}`);
      console.log(
        `   Required Balance: ${updateNftGatingDto.required_balance}`,
      );

      // Save NFT gating config with BOTH network name and chain_id
      const nftGatingConfig = {
        enabled: true,
        network: updateNftGatingDto.network,
        chain_id: networkInfo.chainId,
        contract_address: updateNftGatingDto.contract_address,
        required_balance: updateNftGatingDto.required_balance,
      };

      const updatedServer = await this.serverModel.findByIdAndUpdate(
        serverObjectId,
        { nft_gated: nftGatingConfig },
        { new: true },
      );

      if (!updatedServer) {
        throw new NotFoundException("Server not found after update.");
      }

      console.log(
        `✅ [NFT GATING] NFT gating enabled successfully for server ${serverId}`,
      );

      return updatedServer;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      console.error(
        `❌ [NFT GATING] Failed to enable NFT gating: ${error.message}`,
      );
      throw new BadRequestException(
        `Failed to update NFT gating: ${error.message}`,
      );
    }
  }
}
