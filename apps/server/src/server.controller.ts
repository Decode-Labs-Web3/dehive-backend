import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from "@nestjs/common";
import { ServerService } from "./server.service";
import { CreateServerDto } from "../dto/create-server.dto";
import { UpdateServerDto } from "../dto/update-server.dto";
import { UpdateServerTagsDto } from "../dto/update-server-tags.dto";
import { CreateCategoryDto } from "../dto/create-category.dto";
import { CreateChannelDto } from "../dto/create-channel.dto";
import { UpdateCategoryDto } from "../dto/update-category.dto";
import { UpdateChannelDto } from "../dto/update-channel.dto";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiHeader,
} from "@nestjs/swagger";
import { AuthGuard } from "../common/guards/auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";

@ApiTags("Servers, Categories & Channels")
@Controller("servers")
@UseGuards(AuthGuard)
export class ServerController {
  constructor(private readonly serverService: ServerService) {}
  @Post()
  @ApiOperation({ summary: "Create a new server" })
  @ApiHeader({
    name: "x-session-id",
    description: "Session ID of authenticated user",
    required: true,
  })
  @ApiResponse({ status: 201, description: "Server created successfully." })
  createServer(
    @Body() createServerDto: CreateServerDto,
    @CurrentUser("userId") ownerId: string,
  ) {
    console.log("🎯 [CONTROLLER] createServer called");
    console.log("🎯 [CONTROLLER] ownerId:", ownerId);
    console.log("🎯 [CONTROLLER] ownerId type:", typeof ownerId);
    console.log("🎯 [CONTROLLER] createServerDto:", createServerDto);

    return this.serverService.createServer(createServerDto, ownerId);
  }

  @Get()
  @ApiOperation({
    summary: "Get all servers joined by the user",
    description:
      "Retrieves a list of servers that the authenticated user is a member of.",
  })
  @ApiHeader({
    name: "x-session-id",
    description: "Session ID of authenticated user",
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: "Returns a list of joined servers.",
  })
  findAllServers(@CurrentUser("userId") actorId: string) {
    return this.serverService.findAllServers(actorId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a single server by ID" })
  @ApiHeader({
    name: "x-session-id",
    description: "Session ID of authenticated user",
    required: true,
  })
  @ApiParam({ name: "id", description: "The ID of the server" })
  @ApiResponse({ status: 200, description: "Returns the server details." })
  findServerById(@Param("id") id: string) {
    return this.serverService.findServerById(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a server" })
  @ApiHeader({
    name: "x-session-id",
    description: "Session ID of authenticated user",
    required: true,
  })
  @ApiParam({ name: "id", description: "The ID of the server to update" })
  updateServer(
    @Param("id") id: string,
    @Body() updateServerDto: UpdateServerDto,
    @CurrentUser("userId") actorId: string,
  ) {
    return this.serverService.updateServer(id, updateServerDto, actorId);
  }

  @Patch(":id/tags")
  @ApiOperation({ summary: "Update server tags" })
  @ApiHeader({
    name: "x-session-id",
    description: "Session ID of authenticated user",
    required: true,
  })
  @ApiParam({ name: "id", description: "The ID of the server to update tags" })
  @ApiResponse({
    status: 200,
    description: "Server tags updated successfully.",
  })
  updateServerTags(
    @Param("id") id: string,
    @Body() updateServerTagsDto: UpdateServerTagsDto,
    @CurrentUser("userId") actorId: string,
  ) {
    return this.serverService.updateServerTags(
      id,
      updateServerTagsDto.tags,
      actorId,
    );
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a server" })
  @ApiHeader({
    name: "x-session-id",
    description: "Session ID of authenticated user",
    required: true,
  })
  @ApiParam({ name: "id", description: "The ID of the server to delete" })
  removeServer(
    @Param("id") id: string,
    @CurrentUser("userId") actorId: string,
  ) {
    return this.serverService.removeServer(id, actorId);
  }

  @Post(":serverId/categories")
  @ApiOperation({ summary: "Create a new category" })
  @ApiHeader({
    name: "x-session-id",
    description: "Session ID of authenticated user",
    required: true,
  })
  @ApiParam({ name: "serverId", description: "The ID of the server" })
  createCategory(
    @Param("serverId") serverId: string,
    @Body() createCategoryDto: CreateCategoryDto,
    @CurrentUser("userId") actorId: string,
  ) {
    return this.serverService.createCategory(
      serverId,
      actorId,
      createCategoryDto,
    );
  }

  @Get(":serverId/categories")
  @ApiOperation({ summary: "Get all categories in a server" })
  @ApiHeader({
    name: "x-session-id",
    description: "Session ID of authenticated user",
    required: true,
  })
  @ApiParam({ name: "serverId", description: "The ID of the server" })
  findAllCategoriesInServer(@Param("serverId") serverId: string) {
    return this.serverService.findAllCategoriesInServer(serverId);
  }

  @Patch("categories/:categoryId")
  @ApiOperation({ summary: "Update a category" })
  @ApiHeader({
    name: "x-session-id",
    description: "Session ID of authenticated user",
    required: true,
  })
  @ApiParam({
    name: "categoryId",
    description: "The ID of the category to update",
  })
  updateCategory(
    @Param("categoryId") categoryId: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @CurrentUser("userId") actorId: string,
  ) {
    return this.serverService.updateCategory(
      categoryId,
      actorId,
      updateCategoryDto,
    );
  }

  @Delete("categories/:categoryId")
  @ApiOperation({ summary: "Delete a category" })
  @ApiHeader({
    name: "x-session-id",
    description: "Session ID of authenticated user",
    required: true,
  })
  @ApiParam({
    name: "categoryId",
    description: "The ID of the category to delete",
  })
  removeCategory(
    @Param("categoryId") categoryId: string,
    @CurrentUser("userId") actorId: string,
  ) {
    return this.serverService.removeCategory(categoryId, actorId);
  }

  @Post(":serverId/categories/:categoryId/channels")
  @ApiOperation({ summary: "Create a new channel" })
  @ApiHeader({
    name: "x-session-id",
    description: "Session ID of authenticated user",
    required: true,
  })
  @ApiParam({ name: "serverId", description: "The ID of the server" })
  @ApiParam({ name: "categoryId", description: "The ID of the category" })
  createChannel(
    @Param("serverId") serverId: string,
    @Param("categoryId") categoryId: string,
    @Body() createChannelDto: CreateChannelDto,
    @CurrentUser("userId") actorId: string,
  ) {
    return this.serverService.createChannel(
      serverId,
      categoryId,
      actorId,
      createChannelDto,
    );
  }

  @Get("channels/:channelId")
  @ApiOperation({ summary: "Get a single channel by ID" })
  @ApiHeader({
    name: "x-session-id",
    description: "Session ID of authenticated user",
    required: true,
  })
  @ApiParam({ name: "channelId", description: "The ID of the channel" })
  findChannelById(@Param("channelId") channelId: string) {
    return this.serverService.findChannelById(channelId);
  }

  @Patch("channels/:channelId")
  @ApiOperation({
    summary: "Update a channel",
    description:
      "Update channel properties including name, topic, or move it to a different category within the same server.",
  })
  @ApiHeader({
    name: "x-session-id",
    description: "Session ID of authenticated user",
    required: true,
  })
  @ApiParam({
    name: "channelId",
    description: "The ID of the channel to update",
  })
  updateChannel(
    @Param("channelId") channelId: string,
    @Body() updateChannelDto: UpdateChannelDto,
    @CurrentUser("userId") actorId: string,
  ) {
    return this.serverService.updateChannel(
      channelId,
      actorId,
      updateChannelDto,
    );
  }

  @Delete("channels/:channelId")
  @ApiOperation({ summary: "Delete a channel" })
  @ApiHeader({
    name: "x-session-id",
    description: "Session ID of authenticated user",
    required: true,
  })
  @ApiParam({
    name: "channelId",
    description: "The ID of the channel to delete",
  })
  removeChannel(
    @Param("channelId") channelId: string,
    @CurrentUser("userId") actorId: string,
  ) {
    return this.serverService.removeChannel(channelId, actorId);
  }
}
