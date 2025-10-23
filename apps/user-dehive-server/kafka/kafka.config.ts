import { KafkaOptions, Transport } from "@nestjs/microservices";
import { Partitioners } from "kafkajs";

export const kafkaConfig: KafkaOptions = {
  transport: Transport.KAFKA,
  options: {
    client: {
      clientId: process.env.KAFKA_CLIENT_ID || "user-dehive-server",
      brokers: process.env.KAFKA_BROKERS?.split(",") || ["localhost:9092"],
      retry: {
        initialRetryTime: 100,
        retries: 3,
      },
    },
    consumer: {
      groupId: process.env.KAFKA_GROUP_ID || "user-dehive-server-consumer",
    },
    producer: {
      createPartitioner: Partitioners.LegacyPartitioner,
    },
  },
};
