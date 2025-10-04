"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const axios_1 = require("@nestjs/axios");
const server_schema_1 = require("../schemas/server.schema");
const user_dehive_schema_1 = require("../../user-dehive-server/schemas/user-dehive.schema");
const user_dehive_server_schema_1 = require("../../user-dehive-server/schemas/user-dehive-server.schema");
const category_schema_1 = require("../schemas/category.schema");
const channel_schema_1 = require("../schemas/channel.schema");
const channel_message_schema_1 = require("../schemas/channel-message.schema");
const enum_1 = require("../../user-dehive-server/enum/enum");
let ServerService = class ServerService {
    serverModel;
    categoryModel;
    channelModel;
    userDehiveServerModel;
    userDehiveModel;
    channelMessageModel;
    httpService;
    constructor(serverModel, categoryModel, channelModel, userDehiveServerModel, userDehiveModel, channelMessageModel, httpService) {
        this.serverModel = serverModel;
        this.categoryModel = categoryModel;
        this.channelModel = channelModel;
        this.userDehiveServerModel = userDehiveServerModel;
        this.userDehiveModel = userDehiveModel;
        this.channelMessageModel = channelMessageModel;
        this.httpService = httpService;
    }
    async createServer(createServerDto, ownerBaseId) {
        console.log('🚀 [CREATE SERVER] Starting with ownerBaseId:', ownerBaseId);
        if (!ownerBaseId) {
            throw new common_1.BadRequestException('Owner ID is required');
        }
        const ownerDehiveId = ownerBaseId;
        console.log('🔍 [CREATE SERVER] ownerDehiveId:', ownerDehiveId);
        const session = await this.serverModel.db.startSession();
        session.startTransaction();
        try {
            const newServerData = {
                ...createServerDto,
                owner_id: ownerBaseId,
                member_count: 1,
                is_private: false,
                tags: [],
            };
            const createdServers = await this.serverModel.create([newServerData], {
                session,
            });
            const newServer = createdServers[0];
            const newMembership = new this.userDehiveServerModel({
                user_id: ownerBaseId,
                user_dehive_id: ownerDehiveId,
                server_id: newServer._id,
                role: enum_1.ServerRole.OWNER,
            });
            await newMembership.save({ session });
            await this.userDehiveModel.findByIdAndUpdate(ownerDehiveId, {
                $inc: { server_count: 1 },
                $setOnInsert: {
                    dehive_role: 'USER',
                    status: 'ACTIVE',
                    bio: '',
                    banner_color: null,
                    is_banned: false,
                    banned_by_servers: [],
                },
            }, {
                session,
                upsert: true,
            });
            await session.commitTransaction();
            return newServer;
        }
        catch (error) {
            await session.abortTransaction();
            throw new common_1.BadRequestException('Could not create server.', error.message);
        }
        finally {
            void session.endSession();
        }
    }
    async findAllServers(actorBaseId) {
        const actorDehiveId = actorBaseId;
        const memberships = await this.userDehiveServerModel
            .find({ user_dehive_id: actorDehiveId })
            .select('server_id')
            .lean();
        const serverIds = memberships.map((m) => m.server_id);
        return this.serverModel.find({ _id: { $in: serverIds } }).exec();
    }
    async findServerById(id) {
        const server = await this.serverModel.findById(id).exec();
        if (!server) {
            throw new common_1.NotFoundException(`Server with ID "${id}" not found`);
        }
        return server;
    }
    async updateServer(id, updateServerDto, actorId) {
        const server = await this.findServerById(id);
        if (server.owner_id.toString() !== actorId) {
            throw new common_1.ForbiddenException('You do not have permission to edit this server.');
        }
        const updatedServer = await this.serverModel
            .findByIdAndUpdate(id, updateServerDto, { new: true })
            .exec();
        if (!updatedServer) {
            throw new common_1.NotFoundException(`Server with ID "${id}" not found`);
        }
        return updatedServer;
    }
    async removeServer(id, actorId) {
        const server = await this.findServerById(id);
        if (server.owner_id.toString() !== actorId) {
            throw new common_1.ForbiddenException('You do not have permission to delete this server.');
        }
        const session = await this.serverModel.db.startSession();
        session.startTransaction();
        try {
            const serverId = new mongoose_2.Types.ObjectId(id);
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
                await this.channelModel.deleteMany({ category_id: { $in: categoryIds } }, { session });
            }
            await this.categoryModel.deleteMany({ server_id: serverId }, { session });
            await this.userDehiveServerModel.deleteMany({ server_id: serverId }, { session });
            if (memberIds.length > 0) {
                await this.userDehiveModel.updateMany({ _id: { $in: memberIds } }, { $inc: { server_count: -1 } }, { session });
            }
            await session.commitTransaction();
            return { deleted: true };
        }
        catch (error) {
            await session.abortTransaction();
            throw new common_1.BadRequestException('Could not delete server and its related data.', error.message);
        }
        finally {
            void session.endSession();
        }
    }
    async createCategory(serverId, actorId, createCategoryDto) {
        const server = await this.findServerById(serverId);
        if (server.owner_id.toString() !== actorId) {
            throw new common_1.ForbiddenException('Only the server owner can create categories.');
        }
        const newCategory = new this.categoryModel({
            ...createCategoryDto,
            server_id: server._id,
        });
        return newCategory.save();
    }
    async findAllCategoriesInServer(serverId) {
        return this.categoryModel.aggregate([
            {
                $match: {
                    server_id: new mongoose_2.Types.ObjectId(serverId),
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
    async updateCategory(categoryId, actorId, updateCategoryDto) {
        const category = await this.categoryModel.findById(categoryId);
        if (!category) {
            throw new common_1.NotFoundException(`Category with ID "${categoryId}" not found.`);
        }
        const server = await this.findServerById(category.server_id.toString());
        if (server.owner_id.toString() !== actorId) {
            throw new common_1.ForbiddenException('You do not have permission to edit this category.');
        }
        Object.assign(category, updateCategoryDto);
        return category.save();
    }
    async removeCategory(categoryId, actorId) {
        const categoryObjectId = new mongoose_2.Types.ObjectId(categoryId);
        const category = await this.categoryModel.findById(categoryObjectId);
        if (!category) {
            throw new common_1.NotFoundException(`Category with ID "${categoryId}" not found.`);
        }
        const server = await this.findServerById(category.server_id.toString());
        if (server.owner_id.toString() !== actorId) {
            throw new common_1.ForbiddenException('You do not have permission to delete this category.');
        }
        const session = await this.categoryModel.db.startSession();
        session.startTransaction();
        try {
            await this.channelModel.deleteMany({ category_id: categoryObjectId }, { session });
            await this.categoryModel.findByIdAndDelete(categoryObjectId, { session });
            await session.commitTransaction();
            return { deleted: true };
        }
        catch (error) {
            await session.abortTransaction();
            throw new common_1.BadRequestException('Could not delete category and its channels.', error.message);
        }
        finally {
            void session.endSession();
        }
    }
    async createChannel(serverId, categoryId, actorId, createChannelDto) {
        const serverObjectId = new mongoose_2.Types.ObjectId(serverId);
        const categoryObjectId = new mongoose_2.Types.ObjectId(categoryId);
        const actorObjectId = new mongoose_2.Types.ObjectId(actorId);
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
            throw new common_1.NotFoundException(`Category with ID ${categoryId} not found.`);
        if (category.server_id.toString() !== serverId)
            throw new common_1.BadRequestException('Category does not belong to this server.');
        const hasPermission = actorMembership &&
            (actorMembership.role === enum_1.ServerRole.OWNER ||
                actorMembership.role === enum_1.ServerRole.MODERATOR);
        if (!hasPermission) {
            throw new common_1.ForbiddenException('Only server owners and moderators can create channels.');
        }
        const newChannel = new this.channelModel({
            ...createChannelDto,
            category_id: categoryObjectId,
        });
        return newChannel.save();
    }
    async findChannelById(channelId) {
        const channel = await this.channelModel.findById(channelId).exec();
        if (!channel) {
            throw new common_1.NotFoundException(`Channel with ID "${channelId}" not found.`);
        }
        return channel;
    }
    async updateChannel(channelId, actorId, updateChannelDto) {
        const channel = await this.findChannelById(channelId);
        const category = await this.categoryModel
            .findById(channel.category_id)
            .lean();
        if (!category)
            throw new common_1.NotFoundException('Category containing this channel not found.');
        const actorMembership = await this.userDehiveServerModel
            .findOne({
            server_id: category.server_id,
            user_id: new mongoose_2.Types.ObjectId(actorId),
        })
            .lean();
        const hasPermission = actorMembership &&
            (actorMembership.role === enum_1.ServerRole.OWNER ||
                actorMembership.role === enum_1.ServerRole.MODERATOR);
        if (!hasPermission) {
            throw new common_1.ForbiddenException('You do not have permission to edit channels in this server.');
        }
        if (updateChannelDto.category_id) {
            const newCategory = await this.categoryModel.findById(updateChannelDto.category_id);
            if (!newCategory ||
                newCategory.server_id.toString() !== category.server_id.toString()) {
                throw new common_1.BadRequestException('The new category is invalid or does not belong to the same server.');
            }
        }
        const updatedChannel = await this.channelModel
            .findByIdAndUpdate(channelId, { $set: updateChannelDto }, { new: true })
            .exec();
        if (!updatedChannel) {
            throw new common_1.NotFoundException(`Failed to update channel with ID "${channelId}".`);
        }
        return updatedChannel;
    }
    async removeChannel(channelId, actorId) {
        const channelObjectId = new mongoose_2.Types.ObjectId(channelId);
        const channel = await this.findChannelById(channelId);
        const category = await this.categoryModel
            .findById(channel.category_id)
            .lean();
        if (!category)
            throw new common_1.NotFoundException('Category containing this channel not found.');
        const actorMembership = await this.userDehiveServerModel
            .findOne({
            server_id: category.server_id,
            user_id: new mongoose_2.Types.ObjectId(actorId),
        })
            .lean();
        const hasPermission = actorMembership &&
            (actorMembership.role === enum_1.ServerRole.OWNER ||
                actorMembership.role === enum_1.ServerRole.MODERATOR);
        if (!hasPermission) {
            throw new common_1.ForbiddenException('You do not have permission to delete channels in this server.');
        }
        const session = await this.channelModel.db.startSession();
        session.startTransaction();
        try {
            await this.channelMessageModel.deleteMany({ channel_id: channelObjectId }, { session });
            await this.channelModel.findByIdAndDelete(channelObjectId, { session });
            await session.commitTransaction();
            return { deleted: true };
        }
        catch (error) {
            await session.abortTransaction();
            throw new common_1.BadRequestException('Could not delete channel and its messages.', error.message);
        }
        finally {
            void session.endSession();
        }
    }
};
exports.ServerService = ServerService;
exports.ServerService = ServerService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(server_schema_1.Server.name)),
    __param(1, (0, mongoose_1.InjectModel)(category_schema_1.Category.name)),
    __param(2, (0, mongoose_1.InjectModel)(channel_schema_1.Channel.name)),
    __param(3, (0, mongoose_1.InjectModel)(user_dehive_server_schema_1.UserDehiveServer.name)),
    __param(4, (0, mongoose_1.InjectModel)(user_dehive_schema_1.UserDehive.name)),
    __param(5, (0, mongoose_1.InjectModel)(channel_message_schema_1.ChannelMessage.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        axios_1.HttpService])
], ServerService);
//# sourceMappingURL=server.service.js.map