import { ServerService } from './server.service';
import { CreateServerDto } from '../dto/create-server.dto';
import { UpdateServerDto } from '../dto/update-server.dto';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { CreateChannelDto } from '../dto/create-channel.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { UpdateChannelDto } from '../dto/update-channel.dto';
export declare class ServerController {
    private readonly serverService;
    constructor(serverService: ServerService);
    createServer(createServerDto: CreateServerDto, ownerId: string): Promise<import("../schemas/server.schema").Server>;
    findAllServers(actorId: string): Promise<import("../schemas/server.schema").Server[]>;
    findServerById(id: string): Promise<import("../schemas/server.schema").ServerDocument>;
    updateServer(id: string, updateServerDto: UpdateServerDto, actorId: string): Promise<import("../schemas/server.schema").Server>;
    removeServer(id: string, actorId: string): Promise<{
        deleted: boolean;
    }>;
    createCategory(serverId: string, createCategoryDto: CreateCategoryDto, actorId: string): Promise<import("../schemas/category.schema").Category>;
    findAllCategoriesInServer(serverId: string): Promise<any[]>;
    updateCategory(categoryId: string, updateCategoryDto: UpdateCategoryDto, actorId: string): Promise<import("../schemas/category.schema").Category>;
    removeCategory(categoryId: string, actorId: string): Promise<{
        deleted: boolean;
    }>;
    createChannel(serverId: string, categoryId: string, createChannelDto: CreateChannelDto, actorId: string): Promise<import("../schemas/channel.schema").Channel>;
    findChannelById(channelId: string): Promise<import("../schemas/channel.schema").ChannelDocument>;
    updateChannel(channelId: string, updateChannelDto: UpdateChannelDto, actorId: string): Promise<import("../schemas/channel.schema").Channel>;
    removeChannel(channelId: string, actorId: string): Promise<{
        deleted: boolean;
    }>;
}
