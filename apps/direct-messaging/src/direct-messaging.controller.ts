import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
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

@ApiTags('Direct Messages')
@Controller('dm')
export class DirectMessagingController {
  constructor(private readonly service: DirectMessagingService) {}

  @Post('conversation')
  @ApiOperation({ summary: 'Create or get a 1:1 conversation' })
  @ApiHeader({
    name: 'x-user-id',
    description: 'UserDehiveId of caller',
    required: true,
  })
  async createOrGet(
    @Headers() headers: Record<string, string | undefined>,
    @Body() body: CreateOrGetConversationDto,
  ) {
    const raw = headers['x-user-id'] || headers['x-userid'] || '';
    const selfId = typeof raw === 'string' ? raw : String(raw || '');
    const conv = await this.service.createOrGetConversation(selfId, body);
    return { success: true, statusCode: 200, message: 'OK', data: conv };
  }

  @Get('messages/:conversationId')
  @ApiOperation({ summary: 'List messages in a conversation' })
  @ApiHeader({
    name: 'x-user-id',
    description: 'UserDehiveId of caller',
    required: true,
  })
  @ApiParam({ name: 'conversationId' })
  async list(
    @Headers() headers: Record<string, string | undefined>,
    @Param('conversationId') conversationId: string,
    @Query() query: ListDirectMessagesDto,
  ) {
    const raw = headers['x-user-id'] || headers['x-userid'] || '';
    const selfId = typeof raw === 'string' ? raw : String(raw || '');
    const data = await this.service.listMessages(selfId, conversationId, query);
    return { success: true, statusCode: 200, message: 'OK', data };
  }

  @Post('files/upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a file to a direct conversation' })
  @ApiHeader({ name: 'x-user-id', required: true })
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
    @Headers('x-user-id') selfId: string,
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
    name: 'x-user-id',
    description: 'UserDehiveId of caller',
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
    @Headers('x-user-id') selfId: string,
    @Query() query: ListDirectUploadsDto,
  ) {
    const data = await this.service.listUploads(selfId, query);
    return { success: true, statusCode: 200, message: 'OK', data };
  }
}
