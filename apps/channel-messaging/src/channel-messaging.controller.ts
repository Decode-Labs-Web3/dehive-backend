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
import { AuthenticatedUser } from "../interfaces/authenticated-user.interface";

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
    @CurrentUser("_id") userId: string,
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

  @Get("channel/:channelId")
  @ApiOperation({ summary: "Get paginated messages for a channel" })
  @ApiHeader({
    name: "x-session-id",
    description: "Session ID of authenticated user",
    required: true,
  })
  @ApiParam({
    name: "channelId",
    description: "The ID of the channel to retrieve messages from",
  })
  @ApiResponse({ status: 200, description: "Returns a list of messages." })
  @ApiResponse({
    status: 404,
    description: "No messages found for the channel.",
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async getMessages(
    @Param("channelId") channelId: string,
    @Query() query: GetMessagesDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.messagingService.getMessagesByChannelId(
      channelId,
      query,
      user.session_id,
      user.fingerprint_hash,
    );
    return { success: true, statusCode: 200, message: "OK", data };
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
        channelId: {
          type: "string",
          description: "Channel ID (MongoId)",
        },
      },
      required: ["file", "serverId", "channelId"],
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
    @CurrentUser("_id") userId: string,
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
    @CurrentUser("_id") userId: string,
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
}
