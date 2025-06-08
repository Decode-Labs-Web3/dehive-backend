import { Controller } from '@nestjs/common';
import { EmailWorkerService } from './email-worker.service';
import { MessagePattern, Payload } from '@nestjs/microservices';

@Controller()
export class EmailWorkerController {
  constructor(private readonly emailWorkerService: EmailWorkerService) {}

  @MessagePattern('email.send')
  sendEmail(@Payload() data: any) {
    return this.emailWorkerService.sendEmail(data);
  }
}
