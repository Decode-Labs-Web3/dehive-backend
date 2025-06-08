import { Injectable } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailWorkerService {
  constructor(private readonly configService: ConfigService) {}

  @MessagePattern('email.send')
  async sendEmail(@Payload() data: any) {
    console.log('Received email job from:', data.to);

    const transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST'),
      port: Number(this.configService.get('SMTP_PORT')),
      secure: false,
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASS'),
      },
    });

    try {
      await transporter.sendMail({
        from: this.configService.get('SMTP_USER'),
        to: data.to,
        subject: data.subject,
        html: data.html,
      });
      console.log('Email sent successfully');
    } catch (error) {
      console.error('Error sending email:', error);
    }
  }
}
