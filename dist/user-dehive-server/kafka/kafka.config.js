"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.kafkaConfig = void 0;
const microservices_1 = require("@nestjs/microservices");
const kafkajs_1 = require("kafkajs");
exports.kafkaConfig = {
    transport: microservices_1.Transport.KAFKA,
    options: {
        client: {
            clientId: process.env.KAFKA_CLIENT_ID || 'user-dehive-server',
            brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
            retry: {
                initialRetryTime: 100,
                retries: 3,
            },
        },
        consumer: {
            groupId: process.env.KAFKA_GROUP_ID || 'user-dehive-server-consumer',
        },
        producer: {
            createPartitioner: kafkajs_1.Partitioners.LegacyPartitioner,
        },
    },
};
//# sourceMappingURL=kafka.config.js.map