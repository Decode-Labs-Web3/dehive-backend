import { Controller, Get, Body, Post, Param, Patch, Delete } from '@nestjs/common';
import { DirectConversationService } from './direct-conversation.service';

@Controller('direct-conversation')
export class DirectConversationController {
  constructor(private readonly directConversationService: DirectConversationService) {}

  @Get('health')
  getDirectConversationHealth() {
    return {
      status: 'ok direct-conversation/health'
    }
  }

  @Post('createOrGet')
  createOrGetDirectConversation(@Body() body: { user_id_1: string, user_id_2: string }) {
    return {
      status: 'ok direct-conversation/createOrGet',
      body: body
    }
  }

  @Get(':conversation_id')
  getDirectConversation(@Param('conversation_id') conversation_id: string) {
    return {
      status: 'ok direct-conversation/get',
      conversation_id: conversation_id
    }
  }

  @Get('get-all-by-user-id/:user_id')
  getDirectConversations(@Param('user_id') user_id: string) {
    return {
      status: 'ok direct-conversation/get-all-by-user-id',
      user_id: user_id
    }
  }

  @Get('get-all-by-user-id-and-other-user-id')
  getDirectConversationsByUserIdAndOtherUserId(@Body() body: { user_id: string, other_user_id: string }) {
    return {
      status: 'ok direct-conversation/get-all-by-user-id-and-other-user-id',
      user_id: body.user_id,
      other_user_id: body.other_user_id
    }
  }

  @Patch("enable-encryption")
  enableEncryptionDirectConversation(@Body() body: { conversation_id: string }) {
    return {
      status: 'ok direct-conversation/enableEncryption',
      conversation_id: body.conversation_id
    }
  }
  
  @Delete("delete/:conversation_id")
  deleteDirectConversation(@Param('conversation_id') conversation_id: string) {
    return {
      status: 'ok direct-conversation/delete',
      conversation_id: conversation_id
    }
  }
  
}
