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
} from '@nestjs/common';
import {
  ApiBody,
  ApiConsumes,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { DirectMessagingService } from './direct-messaging.service';
import { CreateOrGetConversationDto } from '../dto/create-or-get-conversation.dto.ts';
import {
  DirectUploadInitDto,
  DirectUploadResponseDto,
} from '../dto/direct-upload.dto';
import { ListDirectMessagesDto } from '../dto/list-direct-messages.dto';
import { Express } from 'express';
import { ListDirectUploadsDto } from '../dto/list-direct-upload.dto';
import { SendDirectMessageDto } from '../dto/send-direct-message.dto';
import { GetFollowingDto } from '../dto/get-following.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

@ApiTags('Direct Messages')
@Controller('dm')
@UseGuards(AuthGuard)
export class DirectMessagingController {
  constructor(private readonly service: DirectMessagingService) {}

  @Post('send')
  @ApiOperation({ summary: 'Send a message to a direct conversation' })
  @ApiHeader({
    name: 'x-session-id',
    description: 'The session ID of the authenticated user',
    required: true,
  })
  @ApiBody({ type: SendDirectMessageDto })
  @ApiResponse({ status: 201, description: 'Message sent successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input or missing fields.' })
  @ApiResponse({
    status: 403,
    description: 'User is not a participant of this conversation.',
  })
  @ApiResponse({ status: 404, description: 'Conversation not found.' })
  async sendMessage(
    @CurrentUser('_id') selfId: string,
    @Body() body: SendDirectMessageDto,
  ) {
    const newMessage = await this.service.sendMessage(selfId, body);
    return {
      success: true,
      statusCode: 201,
      message: 'Message sent successfully',
      data: newMessage,
    };
  }

  @Post('conversation')
  @ApiOperation({ summary: 'Create or get a 1:1 conversation' })
  @ApiHeader({
    name: 'x-session-id',
    description: 'Session ID of authenticated user',
    required: true,
  })
  async createOrGet(
    @CurrentUser('_id') selfId: string,
    @Body() body: CreateOrGetConversationDto,
  ) {
    const conv = await this.service.createOrGetConversation(selfId, body);
    return { success: true, statusCode: 200, message: 'OK', data: conv };
  }

  @Get('messages/:conversationId')
  @ApiOperation({ summary: 'List messages in a conversation' })
  @ApiHeader({
    name: 'x-session-id',
    description: 'Session ID of authenticated user',
    required: true,
  })
  @ApiParam({ name: 'conversationId' })
  async list(
    @CurrentUser('_id') selfId: string,
    @Param('conversationId') conversationId: string,
    @Query() query: ListDirectMessagesDto,
  ) {
    const data = await this.service.listMessages(selfId, conversationId, query);
    return { success: true, statusCode: 200, message: 'OK', data };
  }

  @Post('files/upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a file to a direct conversation' })
  @ApiHeader({
    name: 'x-session-id',
    description: 'Session ID of authenticated user',
    required: true,
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'The file to upload.',
        },
        conversationId: {
          type: 'string',
          description: 'The ID of the direct conversation the file belongs to.',
        },
      },
      required: ['file', 'conversationId'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully and metadata returned.',
    type: DirectUploadResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request, missing file, invalid ID, or file size exceeds limit.',
  })
  @ApiResponse({
    status: 403,
    description: 'User is not a participant of the conversation.',
  })
  @ApiResponse({ status: 404, description: 'Conversation not found.' })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: DirectUploadInitDto,
    @CurrentUser('_id') selfId: string,
  ) {
    const result = await this.service.handleUpload(selfId, file, body);
    return {
      success: true,
      statusCode: 201,
      message: 'File uploaded successfully',
      data: result,
    };
  }

  @Get('files/list')
  @ApiOperation({ summary: 'List files uploaded by the current user in DMs' })
  @ApiHeader({
    name: 'x-session-id',
    description: 'Session ID of authenticated user',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully returned a list of uploaded files.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid user ID or pagination parameters.',
  })
  async listUploads(
    @CurrentUser('_id') selfId: string,
    @Query() query: ListDirectUploadsDto,
  ) {
    const data = await this.service.listUploads(selfId, query);
    return { success: true, statusCode: 200, message: 'OK', data };
  }

  @Get('following')
  @ApiOperation({
    summary: 'Get following list',
    description: 'Retrieves the list of users that the current user is following from Decode service'
  })
  @ApiHeader({
    name: 'x-session-id',
    description: 'Session ID of authenticated user',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully returned following list.',
  })
  @ApiResponse({
    status: 404,
    description: 'Could not retrieve following list from Decode service.',
  })
  async getFollowing(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: GetFollowingDto,
  ) {
    const result = await this.service.getFollowing(currentUser, query);
    return result;
  }
}
