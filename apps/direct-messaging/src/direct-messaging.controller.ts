import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { DirectMessagingService } from './direct-messaging.service';
import {
  CreateOrGetConversationDto,
  ListDirectMessagesDto,
  SendDirectMessageDto,
} from '../dto/create-direct-message.dto';

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

  @Post('send')
  @ApiOperation({ summary: 'Send a direct message (optional attachments)' })
  @ApiHeader({
    name: 'x-user-id',
    description: 'UserDehiveId of sender',
    required: true,
  })
  @ApiBody({ type: SendDirectMessageDto })
  async send(
    @Headers() headers: Record<string, string | undefined>,
    @Body() body: SendDirectMessageDto,
  ) {
    const raw = headers['x-user-id'] || headers['x-userid'] || '';
    const selfId = typeof raw === 'string' ? raw : String(raw || '');
    const msg = await this.service.sendMessage(selfId, body);
    return { success: true, statusCode: 201, message: 'Sent', data: msg };
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
}
