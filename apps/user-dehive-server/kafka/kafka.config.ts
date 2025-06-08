import { KafkaOptions, Transport } from '@nestjs/microservices';

export const kafkaConfig: KafkaOptions = {
  transport: Transport.KAFKA,
  options: {
    client: {
      clientId: process.env.KAFKA_CLIENT_ID,
      brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
    },
    consumer: {
      groupId: process.env.KAFKA_GROUP_ID,
    },
  },
};