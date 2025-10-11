import { Injectable, Inject, Logger, OnModuleInit } from "@nestjs/common";
import { ClientKafka } from "@nestjs/microservices";

@Injectable()
export class EventProducerService implements OnModuleInit {
  private readonly logger = new Logger(EventProducerService.name);

  constructor(
    @Inject("KAFKA_SERVICE") private readonly kafkaClient: ClientKafka,
  ) {}

  async emit(topic: string, payload: unknown) {
    try {
      this.kafkaClient.emit(topic, payload);
      this.logger.log(`Event emitted successfully to topic: ${topic}`);
    } catch (error) {
      this.logger.error(`Failed to emit event to topic ${topic}:`, error);
      throw error;
    }
  }

  async onModuleInit() {
    await this.kafkaClient.connect();
    this.logger.log("Kafka client connected successfully");
  }
}
