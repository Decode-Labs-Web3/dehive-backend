import { OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
export declare class EventProducerService implements OnModuleInit {
    private readonly kafkaClient;
    private readonly logger;
    constructor(kafkaClient: ClientKafka);
    emit(topic: string, payload: any): Promise<void>;
    onModuleInit(): Promise<void>;
}
