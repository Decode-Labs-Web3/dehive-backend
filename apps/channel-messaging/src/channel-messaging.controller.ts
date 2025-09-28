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
  Headers,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiHeader,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { MessagingService } from './channel-messaging.service';
import { GetMessagesDto } from '../dto/get-messages.dto';
import { UploadInitDto, UploadResponseDto } from '../dto/channel-upload.dto';
import { ListUploadsDto } from '../dto/list-channel-upload.dto';

@ApiTags('Channel Messages')
@Controller('messages')
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Get('conversation/:conversationId')
  @ApiOperation({ summary: 'Get paginated messages for a conversation' })
  @ApiParam({
    name: 'conversationId',
    description: 'The ID of the channel conversation to retrieve messages from',
  })
  @ApiResponse({ status: 200, description: 'Returns a list of messages.' })
  @ApiResponse({
    status: 404,
    description: 'No messages found for the channel.',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  getMessages(
    @Param('conversationId') conversationId: string,
    @Query() query: GetMessagesDto,
  ) {
    return this.messagingService
      .getMessagesByConversationId(conversationId, query)
      .then((messages) => ({
        success: true,
        statusCode: 200,
        message: 'Fetched conversation messages successfully',
        data: messages,
      }));
  }

  @Post('files/upload')
  @ApiOperation({ summary: 'Upload a file and return metadata' })
  @ApiHeader({
    name: 'x-user-id',
    description: 'MongoId of User Dehive',
    required: true,
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        serverId: { type: 'string', description: 'Server ID (MongoId)' },
        conversationId: {
          type: 'string',
          description: ' Channel Conversation ID (MongoId)',
        },
      },
      required: ['file', 'serverId', 'conversationId'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully.',
    type: UploadResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Missing header, invalid/missing serverId, not a member, or size/type exceeds limits.',
  })
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadInitDto,
    @Headers() headers: Record<string, string | undefined>,
  ): Promise<any> {
    const raw = headers['x-user-id'] || headers['x-userid'] || '';
    const userId = typeof raw === 'string' ? raw : String(raw || '');
    if (!userId) {
      throw new (await import('@nestjs/common')).BadRequestException(
        'x-user-id header is required',
      );
    }
    const result = await this.messagingService.handleUpload(file, body, userId);
    const merged = Object.assign(
      {},
      result as unknown as Record<string, unknown>,
      {
        success: true,
        statusCode: 201,
        message: 'File uploaded successfully',
      },
    );
    return merged;
  }

  @Get('files/list')
  @ApiOperation({ summary: 'List previously uploaded files (gallery)' })
  @ApiHeader({
    name: 'x-user-id',
    description:
      'MongoId of UserDehive (user_dehive_id); results are restricted to uploads owned by this user',
    required: true,
  })
  @ApiResponse({ status: 200, description: 'Returns paginated uploads.' })
  @ApiResponse({ status: 400, description: 'Invalid query or header.' })
  @ApiResponse({ status: 403, description: 'Not allowed.' })
  async listUploads(
    @Headers() headers: Record<string, string | undefined>,
    @Query() query: ListUploadsDto,
  ) {
    const raw = headers['x-user-id'] || headers['x-userid'] || '';
    const userId = typeof raw === 'string' ? raw : String(raw || '');
    if (!userId) {
      throw new (await import('@nestjs/common')).BadRequestException(
        'x-user-id header is required',
      );
    }
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
      message: 'Fetched uploads successfully',
      data: result,
    };
  }
}
