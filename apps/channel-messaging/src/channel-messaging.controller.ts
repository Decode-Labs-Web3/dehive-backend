import {
  Controller,
  Get,
  Param,
  Query,
  UsePipes,
  ValidationPipe,
  Post,
  UploadedFile,
  Body,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiHeader,
  ApiConsumes,
  ApiBody,
} from "@nestjs/swagger";
import { MessagingService } from "./channel-messaging.service";
import { GetMessagesDto } from "../dto/get-messages.dto";
import { UploadInitDto, UploadResponseDto } from "../dto/channel-upload.dto";
import { ListUploadsDto } from "../dto/list-channel-upload.dto";
import { CreateMessageDto } from "../dto/create-message.dto";
import { AuthGuard } from "../common/guards/auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { UseGuards } from "@nestjs/common";

@ApiTags("Channel Messages")
@Controller("messages")
@UseGuards(AuthGuard)
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Post("send")
  @ApiOperation({ summary: "Send a message to a channel conversation" })
  @ApiHeader({
    name: "x-session-id",
    description: "Session ID of authenticated user",
    required: true,
  })
  @ApiBody({ type: CreateMessageDto })
  @ApiResponse({ status: 201, description: "Message sent successfully." })
  @ApiResponse({ status: 400, description: "Invalid input or missing fields." })
  @ApiResponse({
    status: 403,
    description:
      "User is not allowed to post in this channel (future implementation).",
  })
  @ApiResponse({ status: 404, description: "Conversation not found." })
  async sendMessage(
    @CurrentUser("userId") userId: string,
    @Body() createMessageDto: CreateMessageDto,
  ) {
    const savedMessage = await this.messagingService.createMessage(
      createMessageDto,
      userId,
    );
    return {
      success: true,
      statusCode: 201,
      message: "Message sent successfully",
      data: savedMessage,
    };
  }

  @Get("conversation/:conversationId")
  @ApiOperation({ summary: "Get paginated messages for a conversation" })
  @ApiHeader({
    name: "x-session-id",
    description: "Session ID of authenticated user",
    required: true,
  })
  @ApiParam({
    name: "conversationId",
    description: "The ID of the channel conversation to retrieve messages from",
  })
  @ApiResponse({ status: 200, description: "Returns a list of messages." })
  @ApiResponse({
    status: 404,
    description: "No messages found for the channel.",
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  getMessages(
    @Param("conversationId") conversationId: string,
    @Query() query: GetMessagesDto,
  ) {
    return this.messagingService
      .getMessagesByConversationId(conversationId, query)
      .then((messages) => ({
        success: true,
        statusCode: 200,
        message: "Fetched conversation messages successfully",
        data: messages,
      }));
  }

  @Post("files/upload")
  @ApiOperation({ summary: "Upload a file and return metadata" })
  @ApiHeader({
    name: "x-session-id",
    description: "Session ID of authenticated user",
    required: true,
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
        serverId: { type: "string", description: "Server ID (MongoId)" },
        conversationId: {
          type: "string",
          description: " Channel Conversation ID (MongoId)",
        },
      },
      required: ["file", "serverId", "conversationId"],
    },
  })
  @ApiResponse({
    status: 201,
    description: "File uploaded successfully.",
    type: UploadResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      "Missing header, invalid/missing serverId, not a member, or size/type exceeds limits.",
  })
  @UseInterceptors(FileInterceptor("file"))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadInitDto,
    @CurrentUser("userId") userId: string,
  ): Promise<unknown> {
    const result = await this.messagingService.handleUpload(file, body, userId);
    return {
      success: true,
      statusCode: 201,
      message: "File uploaded successfully",
      data: result,
    };
  }

  @Get("files/list")
  @ApiOperation({ summary: "List previously uploaded files (gallery)" })
  @ApiHeader({
    name: "x-session-id",
    description: "Session ID of authenticated user",
    required: true,
  })
  @ApiResponse({ status: 200, description: "Returns paginated uploads." })
  @ApiResponse({ status: 400, description: "Invalid query or header." })
  @ApiResponse({ status: 403, description: "Not allowed." })
  async listUploads(
    @CurrentUser("userId") userId: string,
    @Query() query: ListUploadsDto,
  ) {
    const result = await this.messagingService.listUploads({
      serverId: query.serverId,
      userId,
      type: query.type,
      page: query.page,
      limit: query.limit,
    });
    return {
      success: true,
      statusCode: 200,
      message: "Fetched uploads successfully",
      data: result,
    };
  }

  @Get("conversation/by-channel/:channelId")
  @ApiOperation({ summary: "Get or create conversation ID for a channel" })
  @ApiHeader({
    name: "x-session-id",
    description: "Session ID of authenticated user",
    required: true,
  })
  @ApiParam({
    name: "channelId",
    description: "The ID of the channel to get conversation for",
    example: "68c5adb6ec465897d540c58",
  })
  @ApiResponse({
    status: 200,
    description: "Returns conversation ID for the channel",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        statusCode: { type: "number" },
        message: { type: "string" },
        data: {
          type: "object",
          properties: {
            conversationId: { type: "string" },
            channelId: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: "Invalid channelId." })
  @ApiResponse({ status: 404, description: "Channel not found." })
  async getConversationByChannelId(@Param("channelId") channelId: string) {
    const conversation =
      await this.messagingService.getOrCreateConversationByChannelId(channelId);
    return {
      success: true,
      statusCode: 200,
      message: "Conversation ID retrieved successfully",
      data: {
        conversationId: String(conversation._id),
        channelId: String(conversation.channelId),
        createdAt: (conversation as any).createdAt,
      },
    };
  }
}
