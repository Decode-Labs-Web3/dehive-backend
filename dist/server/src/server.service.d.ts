import { Model } from 'mongoose';
import { HttpService } from '@nestjs/axios';
import { Server, ServerDocument } from '../schemas/server.schema';
import { UserDehiveDocument } from '../../user-dehive-server/schemas/user-dehive.schema';
import { UserDehiveServerDocument } from '../../user-dehive-server/schemas/user-dehive-server.schema';
import { Category, CategoryDocument } from '../schemas/category.schema';
import { Channel, ChannelDocument } from '../schemas/channel.schema';
import { CreateServerDto } from '../dto/create-server.dto';
import { UpdateServerDto } from '../dto/update-server.dto';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { CreateChannelDto } from '../dto/create-channel.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { UpdateChannelDto } from '../dto/update-channel.dto';
import { ChannelMessageDocument } from '../schemas/channel-message.schema';
export declare class ServerService {
    private readonly serverModel;
    private readonly categoryModel;
    private readonly channelModel;
    private readonly userDehiveServerModel;
    private readonly userDehiveModel;
    private readonly channelMessageModel;
    private readonly httpService;
    constructor(serverModel: Model<ServerDocument>, categoryModel: Model<CategoryDocument>, channelModel: Model<ChannelDocument>, userDehiveServerModel: Model<UserDehiveServerDocument>, userDehiveModel: Model<UserDehiveDocument>, channelMessageModel: Model<ChannelMessageDocument>, httpService: HttpService);
    createServer(createServerDto: CreateServerDto, ownerBaseId: string): Promise<Server>;
    findAllServers(actorBaseId: string): Promise<Server[]>;
    findServerById(id: string): Promise<ServerDocument>;
    updateServer(id: string, updateServerDto: UpdateServerDto, actorId: string): Promise<Server>;
    removeServer(id: string, actorId: string): Promise<{
        deleted: boolean;
    }>;
    createCategory(serverId: string, actorId: string, createCategoryDto: CreateCategoryDto): Promise<Category>;
    findAllCategoriesInServer(serverId: string): Promise<any[]>;
    updateCategory(categoryId: string, actorId: string, updateCategoryDto: UpdateCategoryDto): Promise<Category>;
    removeCategory(categoryId: string, actorId: string): Promise<{
        deleted: boolean;
    }>;
    createChannel(serverId: string, categoryId: string, actorId: string, createChannelDto: CreateChannelDto): Promise<Channel>;
    findChannelById(channelId: string): Promise<ChannelDocument>;
    updateChannel(channelId: string, actorId: string, updateChannelDto: UpdateChannelDto): Promise<Channel>;
    removeChannel(channelId: string, actorId: string): Promise<{
        deleted: boolean;
    }>;
}
