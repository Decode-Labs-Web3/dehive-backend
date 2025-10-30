import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  HttpException,
  HttpStatus,
  Req,
  Headers,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";
import {
  ApiBody,
  ApiConsumes,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiQuery,
} from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { DirectMessagingService } from "./direct-messaging.service";
import { SearchService } from "./search.service";
import { CreateOrGetConversationDto } from "../dto/create-or-get-conversation.dto.ts";
import {
  DirectUploadInitDto,
  DirectUploadResponseDto,
} from "../dto/direct-upload.dto";
import { ListDirectMessagesDto } from "../dto/list-direct-messages.dto";
import { SearchMessageDto } from "../dto/search-message.dto";
import { Express } from "express";
import { ListDirectUploadsDto } from "../dto/list-direct-upload.dto";
import { SendDirectMessageDto } from "../dto/send-direct-message.dto";
import { GetFollowingDto } from "../dto/get-following.dto";
import { GetFollowingMessagesDto } from "../dto/get-following-messages.dto";
import { GetConversationUsersDto } from "../dto/get-conversation-users.dto";
import { AuthGuard } from "../common/guards/auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../interfaces/authenticated-user.interface";
import { Request } from "express";

@ApiTags("Direct Messages")
@Controller("dm")
@UseGuards(AuthGuard)
export class DirectMessagingController {
  constructor(
    private readonly service: DirectMessagingService,
    private readonly searchService: SearchService,
  ) {}

  @Post("send")
  @ApiOperation({ summary: "Send a message to a direct conversation" })
  @ApiHeader({
    name: "x-session-id",
    description: "The session ID of the authenticated user",
    required: true,
  })
  @ApiHeader({
    name: "x-fingerprint-hashed",
    description: "The hashed fingerprint of the client device",
    required: true,
  })
  @ApiBody({ type: SendDirectMessageDto })
  @ApiResponse({ status: 201, description: "Message sent successfully." })
  @ApiResponse({ status: 400, description: "Invalid input or missing fields." })
  @ApiResponse({
    status: 403,
    description: "User is not a participant of this conversation.",
  })
  @ApiResponse({ status: 404, description: "Conversation not found." })
  async sendMessage(
    @CurrentUser("_id") selfId: string,
    @Body() body: SendDirectMessageDto,
    @Req() req: Request,
  ) {
    // Validate HTTP method
    if (req.method !== "POST") {
      throw new HttpException(
        `Method ${req.method} not allowed for this endpoint. Only POST is allowed.`,
        HttpStatus.METHOD_NOT_ALLOWED,
      );
    }

    const newMessage = await this.service.sendMessage(selfId, body);
    return {
      success: true,
      statusCode: 201,
      message: "Message sent successfully",
      data: newMessage,
    };
  }

  @Post("conversation")
  @ApiOperation({ summary: "Create or get a 1:1 conversation" })
  @ApiHeader({
    name: "x-session-id",
    description: "Session ID of authenticated user",
    required: true,
  })
  @ApiHeader({
    name: "x-fingerprint-hashed",
    description: "The hashed fingerprint of the client device",
    required: true,
  })
  async createOrGet(
    @CurrentUser("_id") selfId: string,
    @Body() body: CreateOrGetConversationDto,
    @Req() req: Request,
  ) {
    // Validate HTTP method
    if (req.method !== "POST") {
      throw new HttpException(
        `Method ${req.method} not allowed for this endpoint. Only POST is allowed.`,
        HttpStatus.METHOD_NOT_ALLOWED,
      );
    }

    const conv = await this.service.createOrGetConversation(selfId, body);
    return { success: true, statusCode: 200, message: "OK", data: conv };
  }

  @Get("messages/:conversationId")
  @ApiOperation({ summary: "List messages in a conversation" })
  @ApiHeader({
    name: "x-session-id",
    description: "Session ID of authenticated user",
    required: true,
  })
  @ApiHeader({
    name: "x-fingerprint-hashed",
    description: "The hashed fingerprint of the client device",
    required: true,
  })
  @ApiParam({ name: "conversationId" })
  async list(
    @CurrentUser("_id") selfId: string,
    @Param("conversationId") conversationId: string,
    @Query() query: ListDirectMessagesDto,
    @Req() req: Request,
  ) {
    // Validate HTTP method
    if (req.method !== "GET") {
      throw new HttpException(
        `Method ${req.method} not allowed for this endpoint. Only GET is allowed.`,
        HttpStatus.METHOD_NOT_ALLOWED,
      );
    }

    // Get session ID from headers to get access token from Redis
    const sessionId = req.headers["x-session-id"] as string;
    const fingerprintHash = req.headers["x-fingerprint-hashed"] as string;

    console.log(`[DM-CONTROLLER] Headers:`, {
      "x-session-id": req.headers["x-session-id"],
      "x-fingerprint-hashed": req.headers["x-fingerprint-hashed"],
      sessionId,
      fingerprintHash,
    });

    const data = await this.service.listMessages(
      selfId,
      conversationId,
      query,
      sessionId,
      fingerprintHash,
    );
    return { success: true, statusCode: 200, message: "OK", data };
  }

  @Get("messages/:messageId/:direction")
  @ApiOperation({
    summary: "List messages around an anchor message (point-of-view)",
  })
  @ApiHeader({
    name: "x-session-id",
    description: "Session ID of authenticated user",
    required: true,
  })
  @ApiHeader({
    name: "x-fingerprint-hashed",
    description: "The hashed fingerprint of the client device",
    required: true,
  })
  @ApiParam({ name: "messageId", description: "Anchor message id" })
  @ApiParam({
    name: "direction",
    description: "Direction relative to anchor: 'up' or 'down'",
  })
  @ApiQuery({
    name: "page",
    description: "Page number (0-based)",
    required: false,
  })
  @ApiQuery({ name: "limit", description: "Items per page", required: false })
  @ApiResponse({
    status: 200,
    description: "Returns messages around anchor",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid input or not a participant",
  })
  @ApiResponse({ status: 404, description: "Anchor or conversation not found" })
  async listFromAnchor(
    @CurrentUser("_id") selfId: string,
    @Param("messageId") messageId: string,
    @Param("direction") direction: string,
    @Query("page") page = "0",
    @Query("limit") limit = "10",
    @Req() req: Request,
  ) {
    // enforce GET
    if (req.method !== "GET") {
      throw new HttpException(
        `Method ${req.method} not allowed for this endpoint. Only GET is allowed.`,
        HttpStatus.METHOD_NOT_ALLOWED,
      );
    }

    const sessionId = req.headers["x-session-id"] as string;
    const fingerprintHash = req.headers["x-fingerprint-hashed"] as string;

    const pageNum = Number.parseInt(String(page) || "0", 10) || 0;
    const limitNum = Number.parseInt(String(limit) || "10", 10) || 10;

    const data = await this.service.listMessagesFromAnchor(
      selfId,
      messageId,
      direction as "up" | "down",
      pageNum,
      limitNum,
      sessionId,
      fingerprintHash,
    );

    return { success: true, statusCode: 200, message: "OK", data };
  }

  @Post("files/upload")
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({ summary: "Upload a file to a direct conversation" })
  @ApiHeader({
    name: "x-session-id",
    description: "Session ID of authenticated user",
    required: true,
  })
  @ApiHeader({
    name: "x-fingerprint-hashed",
    description: "The hashed fingerprint of the client device",
    required: true,
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
          description: "The file to upload.",
        },
        conversationId: {
          type: "string",
          description: "The ID of the direct conversation the file belongs to.",
        },
      },
      required: ["file", "conversationId"],
    },
  })
  @ApiResponse({
    status: 201,
    description: "File uploaded successfully and metadata returned.",
    type: DirectUploadResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      "Bad request, missing file, invalid ID, or file size exceeds limit.",
  })
  @ApiResponse({
    status: 403,
    description: "User is not a participant of the conversation.",
  })
  @ApiResponse({ status: 404, description: "Conversation not found." })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: DirectUploadInitDto,
    @CurrentUser("_id") selfId: string,
    @Req() req: Request,
  ) {
    // Validate HTTP method
    if (req.method !== "POST") {
      throw new HttpException(
        `Method ${req.method} not allowed for this endpoint. Only POST is allowed.`,
        HttpStatus.METHOD_NOT_ALLOWED,
      );
    }

    const result = await this.service.handleUpload(selfId, file, body);
    return {
      success: true,
      statusCode: 201,
      message: "File uploaded successfully",
      data: result,
    };
  }

  @Get("files/list")
  @ApiOperation({ summary: "List files uploaded by the current user in DMs" })
  @ApiHeader({
    name: "x-session-id",
    description: "Session ID of authenticated user",
    required: true,
  })
  @ApiHeader({
    name: "x-fingerprint-hashed",
    description: "The hashed fingerprint of the client device",
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: "Successfully returned a list of uploaded files.",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid user ID or pagination parameters.",
  })
  async listUploads(
    @CurrentUser("_id") selfId: string,
    @Query() query: ListDirectUploadsDto,
    @Req() req: Request,
  ) {
    // Validate HTTP method
    if (req.method !== "GET") {
      throw new HttpException(
        `Method ${req.method} not allowed for this endpoint. Only GET is allowed.`,
        HttpStatus.METHOD_NOT_ALLOWED,
      );
    }

    const data = await this.service.listUploads(selfId, query);
    return { success: true, statusCode: 200, message: "OK", data };
  }

  @Get("following")
  @ApiOperation({
    summary: "Get following list",
    description:
      "Retrieves the list of users that the current user is following from Decode service",
  })
  @ApiHeader({
    name: "x-session-id",
    description: "Session ID of authenticated user",
    required: true,
  })
  @ApiHeader({
    name: "x-fingerprint-hashed",
    description: "The hashed fingerprint of the client device",
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: "Successfully returned following list.",
  })
  @ApiResponse({
    status: 404,
    description: "Could not retrieve following list from Decode service.",
  })
  async getFollowing(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: GetFollowingDto,
    @Req() req: Request,
  ) {
    // Validate HTTP method
    if (req.method !== "GET") {
      throw new HttpException(
        `Method ${req.method} not allowed for this endpoint. Only GET is allowed.`,
        HttpStatus.METHOD_NOT_ALLOWED,
      );
    }

    const result = await this.service.getFollowing(currentUser, query);
    return result;
  }

  @Get("following-messages")
  @ApiOperation({
    summary: "Get following users with message info",
    description:
      "Retrieves the list of following users with their conversation info, sorted by last message time",
  })
  @ApiHeader({
    name: "x-session-id",
    description: "Session ID of authenticated user",
    required: true,
  })
  @ApiHeader({
    name: "x-fingerprint-hashed",
    description: "The hashed fingerprint of the client device",
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: "Successfully returned following users with message info.",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        statusCode: { type: "number" },
        message: { type: "string" },
        data: {
          type: "object",
          properties: {
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: {
                    type: "string",
                    description: "User ID",
                  },
                  conversationid: {
                    type: "string",
                    description: "Conversation ID between 2 users",
                  },
                  displayname: {
                    type: "string",
                    description: "User display name",
                  },
                  username: { type: "string", description: "User username" },
                  avatar_ipfs_hash: {
                    type: "string",
                    description: "Avatar IPFS hash",
                  },
                  isActive: {
                    type: "boolean",
                    description: "Whether user is active",
                  },
                  isCall: {
                    type: "boolean",
                    description: "Whether last interaction was a call",
                  },
                  lastMessageAt: {
                    type: "string",
                    format: "date-time",
                    description:
                      "Timestamp of the last message in the conversation",
                  },
                },
              },
            },
            metadata: {
              type: "object",
              properties: {
                page: { type: "number" },
                limit: { type: "number" },
                total: { type: "number" },
                is_last_page: { type: "boolean" },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: "Could not retrieve following list from Decode service.",
  })
  async getFollowingWithMessages(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: GetFollowingMessagesDto,
    @Req() req: Request,
  ) {
    // Validate HTTP method
    if (req.method !== "GET") {
      throw new HttpException(
        `Method ${req.method} not allowed for this endpoint. Only GET is allowed.`,
        HttpStatus.METHOD_NOT_ALLOWED,
      );
    }

    const result = await this.service.getFollowingWithMessages(
      currentUser,
      query,
    );
    return result;
  }

  @Get("conversation/:conversationId/users")
  @ApiOperation({
    summary: "Get other user in a conversation",
    description:
      "Retrieves the information of the other user in a specific conversation (not the current user)",
  })
  @ApiHeader({
    name: "x-session-id",
    description: "Session ID of authenticated user",
    required: true,
  })
  @ApiHeader({
    name: "x-fingerprint-hashed",
    description: "The hashed fingerprint of the client device",
    required: true,
  })
  @ApiParam({
    name: "conversationId",
    description: "ID of the conversation",
    type: String,
    example: "68e8b59f806fb5c06c6551a3",
  })
  @ApiResponse({
    status: 200,
    description: "Successfully returned the other user in conversation.",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        statusCode: { type: "number" },
        message: { type: "string" },
        data: {
          type: "object",
          properties: {
            user: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  description: "User ID",
                },
                displayname: {
                  type: "string",
                  description: "User display name",
                },
                username: {
                  type: "string",
                  description: "User username",
                },
                avatar_ipfs_hash: {
                  type: "string",
                  description: "Avatar IPFS hash",
                },
              },
            },
            conversationId: {
              type: "string",
              description: "Conversation ID",
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Invalid conversation ID or user not a participant.",
  })
  @ApiResponse({
    status: 404,
    description: "Conversation not found.",
  })
  async getConversationUsers(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param() params: GetConversationUsersDto,
    @Req() req: Request,
  ) {
    // Validate HTTP method
    if (req.method !== "GET") {
      throw new HttpException(
        `Method ${req.method} not allowed for this endpoint. Only GET is allowed.`,
        HttpStatus.METHOD_NOT_ALLOWED,
      );
    }

    const result = await this.service.getConversationUsers(currentUser, params);
    return result;
  }

  @Get("conversations/:conversationId/search")
  @ApiOperation({
    summary: "Search messages in a specific direct conversation",
  })
  @ApiHeader({
    name: "x-session-id",
    description: "Session ID of authenticated user",
    required: false,
  })
  @ApiHeader({
    name: "x-fingerprint-hash",
    description: "Fingerprint hash of the user",
    required: false,
  })
  @ApiParam({
    name: "conversationId",
    description: "The ID of the conversation to search messages in",
  })
  @ApiQuery({
    name: "search",
    description: "Search query string",
    required: true,
  })
  @ApiQuery({
    name: "page",
    description: "Page number (default: 0)",
    required: false,
  })
  @ApiQuery({
    name: "limit",
    description: "Number of items per page (default: 20, max: 100)",
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: "Returns search results with relevance score.",
  })
  @ApiResponse({ status: 400, description: "Invalid input." })
  @UsePipes(new ValidationPipe({ transform: true }))
  async searchInConversation(
    @Param("conversationId") conversationId: string,
    @Query() searchDto: SearchMessageDto,
    @Headers("x-session-id") sessionId?: string,
    @Headers("x-fingerprint-hash") fingerprintHash?: string,
  ) {
    const data = await this.searchService.searchInConversation(
      conversationId,
      searchDto,
      sessionId,
      fingerprintHash,
    );
    return {
      success: true,
      statusCode: 200,
      message: "Search completed successfully",
      data,
    };
  }

  // Note: global search across all conversations has been removed.
  // Use the per-conversation endpoint `GET /dm/conversations/:conversationId/search` instead.
}
