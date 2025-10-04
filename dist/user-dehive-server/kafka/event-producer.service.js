"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var EventProducerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventProducerService = void 0;
const common_1 = require("@nestjs/common");
const microservices_1 = require("@nestjs/microservices");
let EventProducerService = EventProducerService_1 = class EventProducerService {
    kafkaClient;
    logger = new common_1.Logger(EventProducerService_1.name);
    constructor(kafkaClient) {
        this.kafkaClient = kafkaClient;
    }
    async emit(topic, payload) {
        try {
            this.kafkaClient.emit(topic, payload);
            this.logger.log(`Event emitted successfully to topic: ${topic}`);
        }
        catch (error) {
            this.logger.error(`Failed to emit event to topic ${topic}:`, error);
            throw error;
        }
    }
    async onModuleInit() {
        await this.kafkaClient.connect();
        this.logger.log('Kafka client connected successfully');
    }
};
exports.EventProducerService = EventProducerService;
exports.EventProducerService = EventProducerService = EventProducerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('KAFKA_SERVICE')),
    __metadata("design:paramtypes", [microservices_1.ClientKafka])
], EventProducerService);
//# sourceMappingURL=event-producer.service.js.map