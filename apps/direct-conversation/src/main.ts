import { NestFactory } from '@nestjs/core';
import { DirectConversationModule } from './direct-conversation.module';

async function bootstrap() {
  const app = await NestFactory.create(DirectConversationModule);
  const port = process.env.DIRECT_CONVERSATION_PORT ?? 5002;
  await app.listen(port);
  console.log(`Direct Conversation is running on: http://localhost:${port}`);
}
bootstrap();
