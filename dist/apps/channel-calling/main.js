/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */,
/* 1 */
/***/ ((module) => {

module.exports = require("@nestjs/core");

/***/ }),
/* 2 */
/***/ ((module) => {

module.exports = require("@nestjs/common");

/***/ }),
/* 3 */
/***/ ((module) => {

module.exports = require("@nestjs/config");

/***/ }),
/* 4 */
/***/ ((module) => {

module.exports = require("@nestjs/swagger");

/***/ }),
/* 5 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ChannelCallModule = void 0;
const common_1 = __webpack_require__(2);
const config_1 = __webpack_require__(3);
const mongoose_1 = __webpack_require__(6);
const axios_1 = __webpack_require__(7);
const ioredis_1 = __webpack_require__(8);
const channel_call_service_1 = __webpack_require__(9);
const channel_call_controller_1 = __webpack_require__(17);
const channel_call_gateway_1 = __webpack_require__(23);
const auth_guard_1 = __webpack_require__(18);
const decode_api_client_1 = __webpack_require__(15);
const channel_call_schema_1 = __webpack_require__(12);
const channel_participant_schema_1 = __webpack_require__(14);
const user_dehive_schema_1 = __webpack_require__(26);
let ChannelCallModule = class ChannelCallModule {
};
exports.ChannelCallModule = ChannelCallModule;
exports.ChannelCallModule = ChannelCallModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: [".env", ".env.local"],
            }),
            mongoose_1.MongooseModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: async (configService) => ({
                    uri: configService.get("MONGODB_URI"),
                    dbName: configService.get("MONGODB_DB_NAME") || "dehive_db",
                }),
                inject: [config_1.ConfigService],
            }),
            mongoose_1.MongooseModule.forFeature([
                { name: channel_call_schema_1.ChannelCall.name, schema: channel_call_schema_1.ChannelCallSchema },
                { name: channel_participant_schema_1.ChannelParticipant.name, schema: channel_participant_schema_1.ChannelParticipantSchema },
                { name: user_dehive_schema_1.UserDehive.name, schema: user_dehive_schema_1.UserDehiveSchema },
            ]),
            axios_1.HttpModule.registerAsync({
                imports: [config_1.ConfigModule],
                useFactory: async (_configService) => ({
                    timeout: 10000,
                    maxRedirects: 5,
                    headers: {
                        "Content-Type": "application/json",
                    },
                }),
                inject: [config_1.ConfigService],
            }),
            ioredis_1.RedisModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: async (configService) => ({
                    type: "single",
                    url: configService.get("REDIS_URI") || "redis://localhost:6379",
                    options: {
                        retryDelayOnFailover: 100,
                        enableReadyCheck: false,
                        maxRetriesPerRequest: null,
                    },
                }),
                inject: [config_1.ConfigService],
            }),
        ],
        controllers: [channel_call_controller_1.ChannelCallController],
        providers: [
            channel_call_service_1.ChannelCallService,
            channel_call_gateway_1.ChannelCallGateway,
            auth_guard_1.AuthGuard,
            decode_api_client_1.DecodeApiClient,
        ],
        exports: [channel_call_service_1.ChannelCallService],
    })
], ChannelCallModule);


/***/ }),
/* 6 */
/***/ ((module) => {

module.exports = require("@nestjs/mongoose");

/***/ }),
/* 7 */
/***/ ((module) => {

module.exports = require("@nestjs/axios");

/***/ }),
/* 8 */
/***/ ((module) => {

module.exports = require("@nestjs-modules/ioredis");

/***/ }),
/* 9 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


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
var ChannelCallService_1;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ChannelCallService = void 0;
const common_1 = __webpack_require__(2);
const mongoose_1 = __webpack_require__(6);
const mongoose_2 = __webpack_require__(10);
const config_1 = __webpack_require__(3);
const ioredis_1 = __webpack_require__(8);
const ioredis_2 = __webpack_require__(11);
const channel_call_schema_1 = __webpack_require__(12);
const channel_participant_schema_1 = __webpack_require__(14);
const enum_1 = __webpack_require__(13);
const decode_api_client_1 = __webpack_require__(15);
let ChannelCallService = ChannelCallService_1 = class ChannelCallService {
    channelCallModel;
    channelParticipantModel;
    configService;
    decodeApiClient;
    redis;
    logger = new common_1.Logger(ChannelCallService_1.name);
    constructor(channelCallModel, channelParticipantModel, configService, decodeApiClient, redis) {
        this.channelCallModel = channelCallModel;
        this.channelParticipantModel = channelParticipantModel;
        this.configService = configService;
        this.decodeApiClient = decodeApiClient;
        this.redis = redis;
    }
    async joinChannel(userId, channelId) {
        this.logger.log(`User ${userId} joining voice channel ${channelId}`);
        let call = await this.channelCallModel
            .findOne({ channel_id: channelId, status: enum_1.CallStatus.CONNECTED })
            .exec();
        if (!call) {
            call = new this.channelCallModel({
                channel_id: channelId,
                status: enum_1.CallStatus.CONNECTED,
                current_participants: 0,
                started_at: new Date(),
            });
            await call.save();
            this.logger.log(`Created new voice channel call for channel ${channelId}`);
        }
        const existingParticipant = await this.channelParticipantModel
            .findOne({ channel_id: channelId, user_id: userId })
            .exec();
        if (existingParticipant) {
            this.logger.log(`User ${userId} already in call ${call._id}`);
            const otherParticipants = await this.getOtherParticipants(channelId, userId);
            return {
                call,
                participant: existingParticipant,
                otherParticipants,
            };
        }
        const participant = new this.channelParticipantModel({
            channel_id: channelId,
            user_id: userId,
            is_muted: false,
            joined_at: new Date(),
        });
        await participant.save();
        const updatedCall = await this.channelCallModel
            .findByIdAndUpdate(call._id, { $inc: { current_participants: 1 } }, { new: true })
            .exec();
        if (!updatedCall) {
            throw new common_1.NotFoundException("Call not found after update");
        }
        const otherParticipants = await this.getOtherParticipants(channelId, userId);
        this.logger.log(`User ${userId} joined voice channel ${channelId}. Total participants: ${updatedCall.current_participants}`);
        return {
            call: updatedCall,
            participant,
            otherParticipants,
        };
    }
    async leaveChannel(userId, channelId) {
        this.logger.log(`User ${userId} leaving voice channel ${channelId}`);
        const call = await this.channelCallModel
            .findOne({ channel_id: channelId, status: enum_1.CallStatus.CONNECTED })
            .exec();
        if (!call) {
            throw new common_1.NotFoundException("No active voice call found for this channel");
        }
        const participant = await this.channelParticipantModel
            .findOne({ channel_id: channelId, user_id: userId })
            .exec();
        if (!participant) {
            throw new common_1.NotFoundException("Participant not found in this voice channel");
        }
        await this.channelParticipantModel
            .findByIdAndDelete(participant._id)
            .exec();
        const updatedCall = await this.channelCallModel
            .findByIdAndUpdate(call._id, { $inc: { current_participants: -1 } }, { new: true })
            .exec();
        this.logger.log(`User ${userId} left voice channel ${channelId}. Participants: ${updatedCall?.current_participants}`);
        if (!updatedCall) {
            throw new common_1.NotFoundException("Call not found after update");
        }
        return { call: updatedCall };
    }
    async leaveCall(userId, channelId) {
        this.logger.log(`User ${userId} leaving voice channel ${channelId}`);
        const call = await this.channelCallModel
            .findOne({ channel_id: channelId, status: enum_1.CallStatus.CONNECTED })
            .exec();
        if (!call) {
            throw new common_1.NotFoundException("Call not found");
        }
        const participant = await this.channelParticipantModel
            .findOne({ channel_id: channelId, user_id: userId })
            .exec();
        if (!participant) {
            throw new common_1.NotFoundException("Participant not found in this voice channel");
        }
        await this.channelParticipantModel
            .findByIdAndDelete(participant._id)
            .exec();
        const updatedCall = await this.channelCallModel
            .findByIdAndUpdate(call._id, { $inc: { current_participants: -1 } }, { new: true })
            .exec();
        if (!updatedCall) {
            throw new common_1.NotFoundException("Call not found after update");
        }
        if (updatedCall.current_participants <= 0) {
            await this.channelCallModel
                .findByIdAndUpdate(call._id, {
                status: enum_1.CallStatus.ENDED,
                ended_at: new Date(),
                end_reason: enum_1.CallEndReason.ALL_PARTICIPANTS_LEFT,
            })
                .exec();
        }
        this.logger.log(`User ${userId} left voice channel ${channelId}. Remaining participants: ${updatedCall.current_participants}`);
        return { call: updatedCall };
    }
    async getOtherParticipants(channelId, userId) {
        const participants = await this.channelParticipantModel
            .find({ channel_id: channelId, user_id: { $ne: userId } })
            .exec();
        const userIds = participants.map((p) => p.user_id.toString());
        if (userIds.length === 0) {
            return [];
        }
        try {
            const users = await this.decodeApiClient.getUsersByIds(userIds);
            return users.map((user) => ({
                _id: user._id,
                username: user.username,
                display_name: user.display_name,
                avatar_ipfs_hash: user.avatar_ipfs_hash,
                bio: user.bio,
                status: user.status,
                is_active: user.is_active,
                session_id: "",
                fingerprint_hash: "",
            }));
        }
        catch (error) {
            this.logger.error("Error fetching other participants:", error);
            return [];
        }
    }
    async getUserProfile(userId) {
        this.logger.log(`Getting user profile for ${userId}`);
        try {
            const cacheKey = `user_profile:${userId}`;
            const cachedData = await this.redis.get(cacheKey);
            if (cachedData) {
                const profile = JSON.parse(cachedData);
                this.logger.log(`[CHANNEL-CALLING] Retrieved cached profile for ${userId} in WebSocket`);
                return {
                    _id: profile.user_dehive_id || profile.user_id || userId,
                    username: profile.username || `User_${userId}`,
                    display_name: profile.display_name || `User_${userId}`,
                    avatar_ipfs_hash: profile.avatar_ipfs_hash || "",
                };
            }
            const error = new Error(`User profile not cached for ${userId}. HTTP API must be called first to cache user profiles before WebSocket usage.`);
            this.logger.error(`[CHANNEL-CALLING] CRITICAL ERROR: ${error.message}`);
            throw error;
        }
        catch (error) {
            this.logger.error(`[CHANNEL-CALLING] Error getting user profile for ${userId}:`, error);
            throw error;
        }
    }
    async handleUserDisconnect(userId, channelId) {
        this.logger.log(`Handling user disconnect for ${userId} from channel ${channelId}`);
        try {
            if (channelId) {
                const call = await this.channelCallModel
                    .findOne({ channel_id: channelId, status: enum_1.CallStatus.CONNECTED })
                    .exec();
                if (call) {
                    const participant = await this.channelParticipantModel
                        .findOne({ channel_id: call._id, user_id: userId })
                        .exec();
                    if (participant) {
                        await this.channelParticipantModel
                            .findByIdAndDelete(participant._id)
                            .exec();
                        await this.channelCallModel
                            .findByIdAndUpdate(call._id, { $inc: { current_participants: -1 } }, { new: true })
                            .exec();
                        if (call.current_participants <= 1) {
                            await this.channelCallModel
                                .findByIdAndUpdate(call._id, {
                                status: enum_1.CallStatus.ENDED,
                                ended_at: new Date(),
                                end_reason: enum_1.CallEndReason.ALL_PARTICIPANTS_LEFT,
                            })
                                .exec();
                        }
                    }
                }
            }
            else {
                const participants = await this.channelParticipantModel
                    .find({ user_id: userId })
                    .exec();
                for (const participant of participants) {
                    const channelIdFromParticipant = participant.channel_id;
                    const call = await this.channelCallModel
                        .findOne({
                        channel_id: channelIdFromParticipant,
                        status: enum_1.CallStatus.CONNECTED,
                    })
                        .exec();
                    if (call && call.status === enum_1.CallStatus.CONNECTED) {
                        await this.channelParticipantModel
                            .findByIdAndDelete(participant._id)
                            .exec();
                        await this.channelCallModel
                            .findByIdAndUpdate(call._id, { $inc: { current_participants: -1 } }, { new: true })
                            .exec();
                        if (call.current_participants <= 1) {
                            await this.channelCallModel
                                .findByIdAndUpdate(call._id, {
                                status: enum_1.CallStatus.ENDED,
                                ended_at: new Date(),
                                end_reason: enum_1.CallEndReason.ALL_PARTICIPANTS_LEFT,
                            })
                                .exec();
                        }
                    }
                }
            }
        }
        catch (error) {
            this.logger.error(`Error handling user disconnect: ${error}`);
        }
    }
    async getChannelParticipants(channelId, sessionId, fingerprintHash) {
        this.logger.log(`Getting participants for channel ${channelId}`);
        try {
            const call = await this.channelCallModel
                .findOne({ channel_id: channelId, status: enum_1.CallStatus.CONNECTED })
                .exec();
            if (!call) {
                return { participants: [] };
            }
            const participants = await this.channelParticipantModel
                .find({ channel_id: channelId })
                .exec();
            const userIds = participants.map((p) => p.user_id.toString());
            if (userIds.length === 0) {
                return { participants: [] };
            }
            try {
                const users = await this.decodeApiClient.getUsersByIds(userIds, sessionId, fingerprintHash);
                return {
                    participants: users.map((user) => ({
                        _id: user._id,
                        username: user.username,
                        display_name: user.display_name,
                        avatar_ipfs_hash: user.avatar_ipfs_hash,
                    })),
                };
            }
            catch (error) {
                this.logger.error("Error fetching participants:", error);
                return { participants: [] };
            }
        }
        catch (error) {
            this.logger.error(`Error getting participants for channel ${channelId}:`, error);
            return { participants: [] };
        }
    }
};
exports.ChannelCallService = ChannelCallService;
exports.ChannelCallService = ChannelCallService = ChannelCallService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(channel_call_schema_1.ChannelCall.name)),
    __param(1, (0, mongoose_1.InjectModel)(channel_participant_schema_1.ChannelParticipant.name)),
    __param(4, (0, ioredis_1.InjectRedis)()),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        config_1.ConfigService,
        decode_api_client_1.DecodeApiClient,
        ioredis_2.Redis])
], ChannelCallService);


/***/ }),
/* 10 */
/***/ ((module) => {

module.exports = require("mongoose");

/***/ }),
/* 11 */
/***/ ((module) => {

module.exports = require("ioredis");

/***/ }),
/* 12 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ChannelCallSchema = exports.ChannelCall = void 0;
const mongoose_1 = __webpack_require__(6);
const mongoose_2 = __webpack_require__(10);
const enum_1 = __webpack_require__(13);
let ChannelCall = class ChannelCall {
    channel_id;
    status;
    end_reason;
    started_at;
    ended_at;
    duration_seconds;
    current_participants;
    metadata;
};
exports.ChannelCall = ChannelCall;
__decorate([
    (0, mongoose_1.Prop)({
        type: mongoose_2.Types.ObjectId,
        ref: "Channel",
        required: true,
        index: true,
    }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], ChannelCall.prototype, "channel_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        enum: enum_1.CallStatus,
        default: enum_1.CallStatus.CONNECTED,
        index: true,
    }),
    __metadata("design:type", String)
], ChannelCall.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        enum: enum_1.CallEndReason,
        required: false,
    }),
    __metadata("design:type", String)
], ChannelCall.prototype, "end_reason", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Date)
], ChannelCall.prototype, "started_at", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Date)
], ChannelCall.prototype, "ended_at", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Number)
], ChannelCall.prototype, "duration_seconds", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: 0 }),
    __metadata("design:type", Number)
], ChannelCall.prototype, "current_participants", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: Object,
        required: false,
    }),
    __metadata("design:type", Object)
], ChannelCall.prototype, "metadata", void 0);
exports.ChannelCall = ChannelCall = __decorate([
    (0, mongoose_1.Schema)({ collection: "channel_calls", timestamps: true })
], ChannelCall);
exports.ChannelCallSchema = mongoose_1.SchemaFactory.createForClass(ChannelCall);
exports.ChannelCallSchema.index({ channel_id: 1, status: 1 });
exports.ChannelCallSchema.index({ status: 1, createdAt: -1 });


/***/ }),
/* 13 */
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CallEndReason = exports.CallStatus = void 0;
var CallStatus;
(function (CallStatus) {
    CallStatus["RINGING"] = "ringing";
    CallStatus["CONNECTING"] = "connecting";
    CallStatus["CONNECTED"] = "connected";
    CallStatus["ENDED"] = "ended";
    CallStatus["DECLINED"] = "declined";
    CallStatus["MISSED"] = "missed";
    CallStatus["TIMEOUT"] = "timeout";
})(CallStatus || (exports.CallStatus = CallStatus = {}));
var CallEndReason;
(function (CallEndReason) {
    CallEndReason["USER_HANGUP"] = "user_hangup";
    CallEndReason["USER_DECLINED"] = "user_declined";
    CallEndReason["USER_BUSY"] = "user_busy";
    CallEndReason["TIMEOUT"] = "timeout";
    CallEndReason["CONNECTION_ERROR"] = "connection_error";
    CallEndReason["NETWORK_ERROR"] = "network_error";
    CallEndReason["SERVER_ERROR"] = "server_error";
    CallEndReason["ALL_PARTICIPANTS_LEFT"] = "all_participants_left";
})(CallEndReason || (exports.CallEndReason = CallEndReason = {}));


/***/ }),
/* 14 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ChannelParticipantSchema = exports.ChannelParticipant = void 0;
const mongoose_1 = __webpack_require__(6);
const mongoose_2 = __webpack_require__(10);
let ChannelParticipant = class ChannelParticipant {
    channel_id;
    user_id;
    joined_at;
    left_at;
    duration_seconds;
    is_audio_enabled;
    is_video_enabled;
    is_audio_muted;
    is_video_muted;
    screen_sharing;
    socket_id;
    connection_quality;
    metadata;
};
exports.ChannelParticipant = ChannelParticipant;
__decorate([
    (0, mongoose_1.Prop)({
        type: mongoose_2.Types.ObjectId,
        ref: "ChannelCall",
        required: true,
        index: true,
    }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], ChannelParticipant.prototype, "channel_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: mongoose_2.Types.ObjectId,
        ref: "UserDehive",
        required: true,
        index: true,
    }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], ChannelParticipant.prototype, "user_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Date)
], ChannelParticipant.prototype, "joined_at", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Date)
], ChannelParticipant.prototype, "left_at", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Number)
], ChannelParticipant.prototype, "duration_seconds", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], ChannelParticipant.prototype, "is_audio_enabled", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], ChannelParticipant.prototype, "is_video_enabled", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], ChannelParticipant.prototype, "is_audio_muted", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], ChannelParticipant.prototype, "is_video_muted", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], ChannelParticipant.prototype, "screen_sharing", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: false }),
    __metadata("design:type", String)
], ChannelParticipant.prototype, "socket_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: Object,
        required: false,
    }),
    __metadata("design:type", Object)
], ChannelParticipant.prototype, "connection_quality", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: Object,
        required: false,
    }),
    __metadata("design:type", Object)
], ChannelParticipant.prototype, "metadata", void 0);
exports.ChannelParticipant = ChannelParticipant = __decorate([
    (0, mongoose_1.Schema)({ collection: "channel_participants", timestamps: true })
], ChannelParticipant);
exports.ChannelParticipantSchema = mongoose_1.SchemaFactory.createForClass(ChannelParticipant);
exports.ChannelParticipantSchema.index({ channel_id: 1, user_id: 1 });
exports.ChannelParticipantSchema.index({ channel_id: 1, is_audio_enabled: 1 });
exports.ChannelParticipantSchema.index({ user_id: 1, is_audio_enabled: 1 });
exports.ChannelParticipantSchema.index({ socket_id: 1 });


/***/ }),
/* 15 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


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
var DecodeApiClient_1;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DecodeApiClient = void 0;
const common_1 = __webpack_require__(2);
const axios_1 = __webpack_require__(7);
const config_1 = __webpack_require__(3);
const rxjs_1 = __webpack_require__(16);
const ioredis_1 = __webpack_require__(8);
const ioredis_2 = __webpack_require__(11);
let DecodeApiClient = DecodeApiClient_1 = class DecodeApiClient {
    httpService;
    configService;
    redis;
    logger = new common_1.Logger(DecodeApiClient_1.name);
    authBaseUrl;
    constructor(httpService, configService, redis) {
        this.httpService = httpService;
        this.configService = configService;
        this.redis = redis;
        const authHost = this.configService.get("DECODE_API_GATEWAY_HOST");
        const authPort = this.configService.get("DECODE_API_GATEWAY_PORT");
        if (!authHost || !authPort) {
            throw new Error("DECODE_API_GATEWAY_HOST and DECODE_API_GATEWAY_PORT must be set in .env file!");
        }
        this.authBaseUrl = `http://${authHost}:${authPort}`;
    }
    async getUserProfile(sessionId, fingerprintHash, userDehiveId) {
        try {
            this.logger.log(`Getting user profile for ${userDehiveId} from decode API`);
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`${this.authBaseUrl}/api/user/profile/${userDehiveId}`, {
                headers: {
                    "x-session-id": sessionId,
                    "x-fingerprint-hashed": fingerprintHash,
                },
            }));
            if (response.data && response.data.success) {
                const profileData = response.data.data;
                const profile = {
                    _id: profileData._id || userDehiveId,
                    username: profileData.username || "",
                    display_name: profileData.display_name || "",
                    avatar_ipfs_hash: profileData.avatar_ipfs_hash || "",
                    bio: profileData.bio,
                    status: profileData.status,
                    banner_color: profileData.banner_color,
                    server_count: profileData.server_count,
                    last_login: profileData.last_login,
                    primary_wallet: profileData.primary_wallet,
                    following_number: profileData.following_number,
                    followers_number: profileData.followers_number,
                    is_following: profileData.is_following,
                    is_follower: profileData.is_follower,
                    is_blocked: profileData.is_blocked,
                    is_blocked_by: profileData.is_blocked_by,
                    mutual_followers_number: profileData.mutual_followers_number,
                    mutual_followers_list: profileData.mutual_followers_list,
                    is_active: profileData.is_active,
                    last_account_deactivation: profileData.last_account_deactivation,
                    dehive_role: profileData.dehive_role,
                    role_subscription: profileData.role_subscription,
                };
                this.logger.log(`Successfully retrieved user profile for ${userDehiveId} from decode API`);
                return profile;
            }
            this.logger.warn(`Failed to get user profile for ${userDehiveId} from decode API: ${response.data?.message || "Unknown error"}`);
            return null;
        }
        catch (error) {
            this.logger.error(`Error getting user profile for ${userDehiveId} from decode API:`, error);
            return null;
        }
    }
    async getUsersByIds(userIds, sessionId, fingerprintHash) {
        try {
            this.logger.log(`Getting users by IDs: ${userIds.join(", ")}`);
            if (!sessionId || !fingerprintHash) {
                this.logger.warn("Session ID or fingerprint hash not provided");
                return [];
            }
            const accessToken = await this.getAccessTokenFromSession(sessionId);
            if (!accessToken) {
                this.logger.warn("Access token not available");
                return [];
            }
            const userPromises = userIds.map(async (userId) => {
                try {
                    const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`${this.authBaseUrl}/users/profile/${userId}`, {
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            "x-fingerprint-hashed": fingerprintHash,
                        },
                    }));
                    if (response.data && response.data.success) {
                        const userData = response.data.data;
                        return {
                            _id: userData._id || userId,
                            username: userData.username || "",
                            display_name: userData.display_name || "",
                            avatar_ipfs_hash: userData.avatar_ipfs_hash || "",
                            bio: userData.bio || "",
                            status: userData.status || "online",
                            is_active: userData.is_active || false,
                            session_id: "",
                            fingerprint_hash: "",
                        };
                    }
                    return null;
                }
                catch (error) {
                    this.logger.error(`Error fetching user ${userId}:`, error);
                    return null;
                }
            });
            const users = await Promise.all(userPromises);
            const validUsers = users.filter((user) => user !== null);
            this.logger.log(`Successfully retrieved ${validUsers.length} users from decode API`);
            return validUsers;
        }
        catch (error) {
            this.logger.error(`Error getting users from decode API:`, error);
            return [];
        }
    }
    async getAccessTokenFromSession(sessionId) {
        try {
            const sessionKey = `session:${sessionId}`;
            const sessionRaw = await this.redis.get(sessionKey);
            if (!sessionRaw)
                return null;
            const sessionData = JSON.parse(sessionRaw);
            return sessionData?.access_token || null;
        }
        catch (error) {
            this.logger.error(`Failed to parse session data for key session:${sessionId}`, error);
            return null;
        }
    }
};
exports.DecodeApiClient = DecodeApiClient;
exports.DecodeApiClient = DecodeApiClient = DecodeApiClient_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, ioredis_1.InjectRedis)()),
    __metadata("design:paramtypes", [axios_1.HttpService,
        config_1.ConfigService,
        ioredis_2.Redis])
], DecodeApiClient);


/***/ }),
/* 16 */
/***/ ((module) => {

module.exports = require("rxjs");

/***/ }),
/* 17 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


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
var ChannelCallController_1;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ChannelCallController = void 0;
const openapi = __webpack_require__(4);
const common_1 = __webpack_require__(2);
const swagger_1 = __webpack_require__(4);
const channel_call_service_1 = __webpack_require__(9);
const auth_guard_1 = __webpack_require__(18);
const current_user_decorator_1 = __webpack_require__(19);
const auth_guard_2 = __webpack_require__(18);
const join_call_dto_1 = __webpack_require__(20);
const leave_call_dto_1 = __webpack_require__(22);
let ChannelCallController = ChannelCallController_1 = class ChannelCallController {
    channelCallService;
    logger = new common_1.Logger(ChannelCallController_1.name);
    constructor(channelCallService) {
        this.channelCallService = channelCallService;
    }
    async joinCall(joinCallDto, user) {
        this.logger.log(`User ${user._id} joining voice channel ${joinCallDto.channel_id}`);
        try {
            const result = await this.channelCallService.joinChannel(user._id, joinCallDto.channel_id);
            return {
                success: true,
                statusCode: 200,
                message: "Successfully joined voice channel call",
                data: {
                    channel_id: result.call.channel_id,
                    status: result.call.status,
                    participant_count: result.call.current_participants,
                    created_at: result.call
                        .createdAt,
                },
            };
        }
        catch (error) {
            this.logger.error("Error joining voice channel call:", error);
            return {
                success: false,
                statusCode: 500,
                message: "Failed to join voice channel call",
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
    async leaveCall(leaveCallDto, user) {
        this.logger.log(`User ${user._id} leaving voice channel ${leaveCallDto.channel_id}`);
        try {
            const result = await this.channelCallService.leaveChannel(user._id, leaveCallDto.channel_id);
            return {
                success: true,
                statusCode: 200,
                message: "Successfully left voice channel call",
                data: {
                    channel_id: leaveCallDto.channel_id,
                    status: "left",
                    participant_count: result.call.current_participants,
                },
            };
        }
        catch (error) {
            this.logger.error("Error leaving voice channel call:", error);
            return {
                success: false,
                statusCode: 500,
                message: "Failed to leave voice channel call",
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
    async test() {
        return {
            success: true,
            statusCode: 200,
            message: "Channel calling service is working!",
            data: {
                service: "channel-calling",
                status: "active",
                timestamp: new Date().toISOString(),
            },
        };
    }
    async getParticipants(channelId, user) {
        this.logger.log(`Getting participants for channel ${channelId}`);
        try {
            const result = await this.channelCallService.getChannelParticipants(channelId, user.session_id, user.fingerprint_hash);
            return {
                success: true,
                statusCode: 200,
                message: "Participants retrieved successfully",
                data: {
                    channel_id: channelId,
                    participants: result.participants,
                    count: result.participants.length,
                },
            };
        }
        catch (error) {
            this.logger.error("Error getting participants:", error);
            return {
                success: false,
                statusCode: 500,
                message: "Failed to get participants",
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
};
exports.ChannelCallController = ChannelCallController;
__decorate([
    (0, common_1.Post)("join"),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: "Join a voice channel call" }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: "Successfully joined voice channel call",
    }),
    (0, swagger_1.ApiBearerAuth)(),
    openapi.ApiResponse({ status: common_1.HttpStatus.OK }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [join_call_dto_1.JoinCallDto, Object]),
    __metadata("design:returntype", Promise)
], ChannelCallController.prototype, "joinCall", null);
__decorate([
    (0, common_1.Post)("leave"),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: "Leave a voice channel call" }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: "Successfully left voice channel call",
    }),
    (0, swagger_1.ApiBearerAuth)(),
    openapi.ApiResponse({ status: common_1.HttpStatus.OK }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [leave_call_dto_1.LeaveCallDto, Object]),
    __metadata("design:returntype", Promise)
], ChannelCallController.prototype, "leaveCall", null);
__decorate([
    (0, common_1.Get)("test"),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: "Test endpoint" }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: "Test endpoint working",
    }),
    (0, auth_guard_2.Public)(),
    openapi.ApiResponse({ status: common_1.HttpStatus.OK }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ChannelCallController.prototype, "test", null);
__decorate([
    (0, common_1.Get)("participants"),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: "Get participants in a channel call" }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: "Participants retrieved successfully",
    }),
    (0, swagger_1.ApiBearerAuth)(),
    openapi.ApiResponse({ status: common_1.HttpStatus.OK }),
    __param(0, (0, common_1.Query)("channel_id")),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ChannelCallController.prototype, "getParticipants", null);
exports.ChannelCallController = ChannelCallController = ChannelCallController_1 = __decorate([
    (0, swagger_1.ApiTags)("Channel Calling"),
    (0, common_1.Controller)("channel-calls"),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __metadata("design:paramtypes", [channel_call_service_1.ChannelCallService])
], ChannelCallController);


/***/ }),
/* 18 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


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
var AuthGuard_1;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AuthGuard = exports.Public = exports.PUBLIC_KEY = void 0;
const common_1 = __webpack_require__(2);
const core_1 = __webpack_require__(1);
const axios_1 = __webpack_require__(7);
const rxjs_1 = __webpack_require__(16);
const ioredis_1 = __webpack_require__(8);
const ioredis_2 = __webpack_require__(11);
const config_1 = __webpack_require__(3);
exports.PUBLIC_KEY = "public";
const Public = () => (0, common_1.SetMetadata)(exports.PUBLIC_KEY, true);
exports.Public = Public;
let AuthGuard = AuthGuard_1 = class AuthGuard {
    httpService;
    reflector;
    configService;
    redis;
    logger = new common_1.Logger(AuthGuard_1.name);
    authServiceUrl;
    constructor(httpService, reflector, configService, redis) {
        this.httpService = httpService;
        this.reflector = reflector;
        this.configService = configService;
        this.redis = redis;
        const host = this.configService.get("DECODE_API_GATEWAY_HOST");
        const port = this.configService.get("DECODE_API_GATEWAY_PORT");
        if (!host || !port) {
            throw new Error("DECODE_API_GATEWAY_HOST and DECODE_API_GATEWAY_PORT must be set in .env file!");
        }
        this.authServiceUrl = `http://${host}:${port}`;
    }
    async canActivate(context) {
        const isPublic = this.reflector.get(exports.PUBLIC_KEY, context.getHandler());
        if (isPublic)
            return true;
        const request = context.switchToHttp().getRequest();
        const sessionId = request.headers["x-session-id"];
        const fingerprintHash = request.headers["x-fingerprint-hashed"];
        if (!sessionId) {
            throw new common_1.UnauthorizedException("Session ID is required");
        }
        if (!fingerprintHash) {
            throw new common_1.UnauthorizedException("Fingerprint hash is required in headers (x-fingerprint-hashed)");
        }
        try {
            const sessionKey = `session:${sessionId}`;
            const cachedSessionRaw = await this.redis.get(sessionKey);
            if (cachedSessionRaw) {
                const cachedSession = JSON.parse(cachedSessionRaw);
                if (cachedSession.user) {
                    const authenticatedUser = {
                        ...cachedSession.user,
                        session_id: sessionId,
                        fingerprint_hash: fingerprintHash,
                    };
                    request["user"] = authenticatedUser;
                    return true;
                }
            }
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`${this.authServiceUrl}/auth/sso/validate`, {
                headers: { "x-session-id": sessionId },
            }));
            const sessionData = response.data.data;
            if (!sessionData || !sessionData.access_token) {
                throw new common_1.UnauthorizedException("Invalid session data from auth service");
            }
            const profileResponse = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`${this.authServiceUrl}/users/profile/me`, {
                headers: { Authorization: `Bearer ${sessionData.access_token}` },
            }));
            const userProfile = profileResponse.data.data;
            if (!userProfile) {
                throw new common_1.UnauthorizedException("Could not retrieve user profile");
            }
            const cacheData = {
                session_token: sessionData.session_token,
                access_token: sessionData.access_token,
                user: userProfile,
                expires_at: sessionData.expires_at,
            };
            const ttl = Math.ceil((new Date(sessionData.expires_at).getTime() - Date.now()) / 1000);
            if (ttl > 0) {
                await this.redis.set(sessionKey, JSON.stringify(cacheData), "EX", ttl);
            }
            const authenticatedUser = {
                ...userProfile,
                session_id: sessionId,
                fingerprint_hash: fingerprintHash,
            };
            request["user"] = authenticatedUser;
            return true;
        }
        catch (error) {
            this.logger.error(`Authentication failed for session ${sessionId}:`, error.stack);
            throw new common_1.UnauthorizedException("Authentication failed or invalid session");
        }
    }
};
exports.AuthGuard = AuthGuard;
exports.AuthGuard = AuthGuard = AuthGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, ioredis_1.InjectRedis)()),
    __metadata("design:paramtypes", [axios_1.HttpService,
        core_1.Reflector,
        config_1.ConfigService,
        ioredis_2.Redis])
], AuthGuard);


/***/ }),
/* 19 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CurrentUser = void 0;
const common_1 = __webpack_require__(2);
exports.CurrentUser = (0, common_1.createParamDecorator)((data, ctx) => {
    console.log("🎯 [CHANNEL-CALLING CURRENT USER] Decorator called with data:", data);
    try {
        const request = ctx
            .switchToHttp()
            .getRequest();
        console.log("🎯 [CHANNEL-CALLING CURRENT USER] Request user:", request.user);
        console.log("🎯 [CHANNEL-CALLING CURRENT USER] Request sessionId:", request.sessionId);
        if (data === "sessionId") {
            return request.sessionId;
        }
        const user = request.user;
        if (data && user) {
            console.log(`🎯 [CHANNEL-CALLING CURRENT USER] Returning user.${data}:`, user[data]);
            return user[data];
        }
        console.log("🎯 [CHANNEL-CALLING CURRENT USER] Returning full user:", user);
        return user;
    }
    catch (error) {
        console.error("❌ [CHANNEL-CALLING CURRENT USER] Error:", error);
        return undefined;
    }
});


/***/ }),
/* 20 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.JoinCallDto = void 0;
const openapi = __webpack_require__(4);
const class_validator_1 = __webpack_require__(21);
const swagger_1 = __webpack_require__(4);
class JoinCallDto {
    channel_id;
    static _OPENAPI_METADATA_FACTORY() {
        return { channel_id: { required: true, type: () => String } };
    }
}
exports.JoinCallDto = JoinCallDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "ID of the channel to join call",
        example: "507f1f77bcf86cd799439011",
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], JoinCallDto.prototype, "channel_id", void 0);


/***/ }),
/* 21 */
/***/ ((module) => {

module.exports = require("class-validator");

/***/ }),
/* 22 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.LeaveCallDto = void 0;
const openapi = __webpack_require__(4);
const class_validator_1 = __webpack_require__(21);
const swagger_1 = __webpack_require__(4);
class LeaveCallDto {
    channel_id;
    static _OPENAPI_METADATA_FACTORY() {
        return { channel_id: { required: true, type: () => String } };
    }
}
exports.LeaveCallDto = LeaveCallDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "ID of the channel to leave",
        example: "68e79a7a52197caed37269dc",
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], LeaveCallDto.prototype, "channel_id", void 0);


/***/ }),
/* 23 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ChannelCallGateway = void 0;
const websockets_1 = __webpack_require__(24);
const socket_io_1 = __webpack_require__(25);
const mongoose_1 = __webpack_require__(10);
const mongoose_2 = __webpack_require__(6);
const channel_call_service_1 = __webpack_require__(9);
const user_dehive_schema_1 = __webpack_require__(26);
const channel_call_schema_1 = __webpack_require__(12);
const channel_participant_schema_1 = __webpack_require__(14);
let ChannelCallGateway = class ChannelCallGateway {
    service;
    userDehiveModel;
    channelCallModel;
    participantModel;
    server;
    meta;
    constructor(service, userDehiveModel, channelCallModel, participantModel) {
        this.service = service;
        this.userDehiveModel = userDehiveModel;
        this.channelCallModel = channelCallModel;
        this.participantModel = participantModel;
        this.meta = new Map();
        console.log("[CHANNEL-RTC-WS] Gateway constructor called");
        console.log("[CHANNEL-RTC-WS] Service injected:", {
            hasService: !!this.service,
            serviceType: typeof this.service,
            serviceName: this.service?.constructor?.name,
        });
        console.log("[CHANNEL-RTC-WS] userDehiveModel available:", !!this.userDehiveModel);
        console.log("[CHANNEL-RTC-WS] channelCallModel available:", !!this.channelCallModel);
        console.log("[CHANNEL-RTC-WS] participantModel available:", !!this.participantModel);
    }
    send(client, event, data) {
        client.emit(event, data);
    }
    handleConnection(client) {
        console.log("[CHANNEL-RTC-WS] ========================================");
        console.log("[CHANNEL-RTC-WS] Client connected to /channel-rtc namespace. Awaiting identity.");
        console.log(`[CHANNEL-RTC-WS] Socket ID: ${client.id}`);
        console.log("[CHANNEL-RTC-WS] ========================================");
        if (!this.meta) {
            this.meta = new Map();
        }
        this.meta.set(client, {});
    }
    handleDisconnect(client) {
        if (!this.meta) {
            this.meta = new Map();
        }
        const meta = this.meta.get(client);
        if (meta?.userDehiveId) {
            console.log(`[CHANNEL-RTC-WS] User ${meta.userDehiveId} disconnected from /channel-rtc`);
            try {
                this.service.handleUserDisconnect(meta.userDehiveId, meta.channelId);
            }
            catch (error) {
                console.error("[CHANNEL-RTC-WS] Error in handleUserDisconnect:", error);
            }
        }
        this.meta.delete(client);
    }
    async handleIdentity(data, client) {
        console.log(`[CHANNEL-RTC-WS] Identity request received:`, data);
        console.log(`[CHANNEL-RTC-WS] Data type:`, typeof data);
        console.log(`[CHANNEL-RTC-WS] Is object:`, typeof data === "object");
        if (!this.meta) {
            this.meta = new Map();
        }
        let userDehiveId;
        console.log(`[CHANNEL-RTC-WS] Parsing data...`);
        if (typeof data === "string") {
            console.log(`[CHANNEL-RTC-WS] String format detected, trying to parse as JSON`);
            try {
                const parsedData = JSON.parse(data);
                if (parsedData.userDehiveId) {
                    console.log(`[CHANNEL-RTC-WS] Successfully parsed JSON string`);
                    userDehiveId = parsedData.userDehiveId;
                }
                else {
                    console.log(`[CHANNEL-RTC-WS] Parsed JSON but no userDehiveId found, treating as plain string`);
                    userDehiveId = data;
                }
            }
            catch {
                console.log(`[CHANNEL-RTC-WS] Failed to parse JSON, treating as plain string`);
                userDehiveId = data;
            }
        }
        else if (typeof data === "object" && data?.userDehiveId) {
            console.log(`[CHANNEL-RTC-WS] Object format detected:`, data);
            userDehiveId = data.userDehiveId;
            console.log(`[CHANNEL-RTC-WS] Extracted userDehiveId:`, userDehiveId);
        }
        else {
            console.log(`[CHANNEL-RTC-WS] Invalid format, returning error`);
            return this.send(client, "error", {
                message: "Invalid identity format. Send userDehiveId as string or {userDehiveId: string}",
                code: "INVALID_FORMAT",
                timestamp: new Date().toISOString(),
            });
        }
        console.log(`[CHANNEL-RTC-WS] Validating userDehiveId:`, userDehiveId);
        if (!userDehiveId || !mongoose_1.Types.ObjectId.isValid(userDehiveId)) {
            console.log(`[CHANNEL-RTC-WS] Invalid userDehiveId, returning error`);
            return this.send(client, "error", {
                message: "Invalid userDehiveId",
                code: "INVALID_USER_ID",
                timestamp: new Date().toISOString(),
            });
        }
        console.log(`[CHANNEL-RTC-WS] Checking if user exists: ${userDehiveId}`);
        const exists = await this.userDehiveModel.exists({
            _id: new mongoose_1.Types.ObjectId(userDehiveId),
        });
        console.log(`[CHANNEL-RTC-WS] User exists result: ${exists}`);
        if (!exists) {
            console.log(`[CHANNEL-RTC-WS] User not found in database: ${userDehiveId}`);
            return this.send(client, "error", {
                message: "User not found",
                code: "USER_NOT_FOUND",
                timestamp: new Date().toISOString(),
            });
        }
        console.log(`[CHANNEL-RTC-WS] Accepting identity for user: ${userDehiveId}`);
        console.log(`[CHANNEL-RTC-WS] Getting meta for client:`, client.id);
        const meta = this.meta.get(client);
        console.log(`[CHANNEL-RTC-WS] Meta found:`, !!meta);
        if (meta) {
            meta.userDehiveId = userDehiveId;
            void client.join(`user:${userDehiveId}`);
            console.log(`[CHANNEL-RTC-WS] User identified as ${userDehiveId}`);
            this.send(client, "identityConfirmed", {
                userDehiveId,
                status: "success",
                timestamp: new Date().toISOString(),
            });
        }
        else {
            console.log(`[CHANNEL-RTC-WS] No meta found for client, creating new one`);
            this.meta.set(client, {
                userDehiveId,
                channelId: undefined,
            });
            void client.join(`user:${userDehiveId}`);
            console.log(`[CHANNEL-RTC-WS] User identified as ${userDehiveId}`);
            this.send(client, "identityConfirmed", {
                userDehiveId,
                status: "success",
                timestamp: new Date().toISOString(),
            });
        }
    }
    async handleJoinChannel(data, client) {
        if (!this.meta) {
            this.meta = new Map();
        }
        const meta = this.meta.get(client);
        const userId = meta?.userDehiveId;
        console.log("[CHANNEL-RTC-WS] Meta debug:", {
            hasMeta: !!meta,
            userId: userId,
        });
        let parsedData;
        if (typeof data === "string") {
            try {
                parsedData = JSON.parse(data);
            }
            catch {
                return this.send(client, "error", {
                    message: "Invalid JSON format",
                    code: "INVALID_FORMAT",
                    timestamp: new Date().toISOString(),
                });
            }
        }
        else {
            parsedData = data;
        }
        console.log("[CHANNEL-RTC-WS] ========================================");
        console.log("[CHANNEL-RTC-WS] joinChannel event received");
        console.log("[CHANNEL-RTC-WS] Parsed data:", parsedData);
        console.log("[CHANNEL-RTC-WS] channel_id:", parsedData?.channel_id);
        console.log("[CHANNEL-RTC-WS] User ID:", userId);
        console.log("[CHANNEL-RTC-WS] ========================================");
        if (!userId) {
            return this.send(client, "error", {
                message: "Please identify first",
                code: "AUTHENTICATION_REQUIRED",
                timestamp: new Date().toISOString(),
            });
        }
        try {
            console.log("[CHANNEL-RTC-WS] Using service for join channel");
            const result = await this.service.joinChannel(userId, parsedData.channel_id);
            meta.channelId = parsedData.channel_id;
            this.meta.set(client, meta);
            await client.join(`channel:${parsedData.channel_id}`);
            this.send(client, "channelJoined", {
                channel_id: parsedData.channel_id,
                status: result.call.status,
                participants: result.otherParticipants,
                timestamp: new Date().toISOString(),
            });
            let userInfo;
            try {
                const profile = await this.service.getUserProfile(userId);
                if (profile) {
                    userInfo = {
                        _id: profile._id,
                        username: profile.username,
                        display_name: profile.display_name,
                        avatar_ipfs_hash: profile.avatar_ipfs_hash,
                    };
                }
                else {
                    throw new Error("Profile is null");
                }
            }
            catch (error) {
                console.error("[CHANNEL-RTC-WS] Error getting user profile:", error);
                userInfo = {
                    _id: userId,
                    username: "user_" + userId.substring(0, 8),
                    display_name: "User " + userId.substring(0, 8),
                    avatar_ipfs_hash: "",
                };
            }
            this.server
                .to(`channel:${parsedData.channel_id}`)
                .emit("userJoinedChannel", {
                channel_id: parsedData.channel_id,
                user_id: userId,
                user_info: userInfo,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error("[CHANNEL-RTC-WS] Error joining channel:", error);
            this.send(client, "error", {
                message: "Failed to join channel",
                details: error instanceof Error ? error.message : String(error),
                timestamp: new Date().toISOString(),
            });
        }
    }
    async handleLeaveChannel(data, client) {
        if (!this.meta) {
            this.meta = new Map();
        }
        const meta = this.meta.get(client);
        const userId = meta?.userDehiveId;
        let parsedData;
        if (typeof data === "string") {
            try {
                parsedData = JSON.parse(data);
            }
            catch {
                return this.send(client, "error", {
                    message: "Invalid JSON format",
                    code: "INVALID_FORMAT",
                    timestamp: new Date().toISOString(),
                });
            }
        }
        else {
            parsedData = data;
        }
        if (!userId) {
            return this.send(client, "error", {
                message: "Please identify first",
                code: "AUTHENTICATION_REQUIRED",
                timestamp: new Date().toISOString(),
            });
        }
        try {
            console.log("[CHANNEL-RTC-WS] Using service for leave channel");
            const result = await this.service.leaveCall(userId, parsedData.channel_id);
            meta.channelId = undefined;
            this.meta.set(client, meta);
            await client.leave(`channel:${parsedData.channel_id}`);
            this.send(client, "channelLeft", {
                channel_id: parsedData.channel_id,
                status: result.call.status,
                timestamp: new Date().toISOString(),
            });
            this.server
                .to(`channel:${parsedData.channel_id}`)
                .emit("userLeftChannel", {
                channel_id: parsedData.channel_id,
                user_id: userId,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error("[CHANNEL-RTC-WS] Error leaving channel:", error);
            this.send(client, "error", {
                message: "Failed to leave channel",
                details: error instanceof Error ? error.message : String(error),
                timestamp: new Date().toISOString(),
            });
        }
    }
    handlePing(client) {
        console.log(`[CHANNEL-RTC-WS] Ping received from ${client.id}`);
        this.send(client, "pong", {
            timestamp: new Date().toISOString(),
            message: "pong",
        });
    }
};
exports.ChannelCallGateway = ChannelCallGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], ChannelCallGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)("identity"),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], ChannelCallGateway.prototype, "handleIdentity", null);
__decorate([
    (0, websockets_1.SubscribeMessage)("joinChannel"),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], ChannelCallGateway.prototype, "handleJoinChannel", null);
__decorate([
    (0, websockets_1.SubscribeMessage)("leaveChannel"),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], ChannelCallGateway.prototype, "handleLeaveChannel", null);
__decorate([
    (0, websockets_1.SubscribeMessage)("ping"),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], ChannelCallGateway.prototype, "handlePing", null);
exports.ChannelCallGateway = ChannelCallGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        namespace: "/channel-rtc",
        cors: { origin: "*" },
    }),
    __param(1, (0, mongoose_2.InjectModel)(user_dehive_schema_1.UserDehive.name)),
    __param(2, (0, mongoose_2.InjectModel)(channel_call_schema_1.ChannelCall.name)),
    __param(3, (0, mongoose_2.InjectModel)(channel_participant_schema_1.ChannelParticipant.name)),
    __metadata("design:paramtypes", [channel_call_service_1.ChannelCallService,
        mongoose_1.Model,
        mongoose_1.Model,
        mongoose_1.Model])
], ChannelCallGateway);


/***/ }),
/* 24 */
/***/ ((module) => {

module.exports = require("@nestjs/websockets");

/***/ }),
/* 25 */
/***/ ((module) => {

module.exports = require("socket.io");

/***/ }),
/* 26 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.UserDehiveSchema = exports.UserDehive = void 0;
const mongoose_1 = __webpack_require__(6);
const mongoose_2 = __webpack_require__(10);
let UserDehive = class UserDehive extends mongoose_2.Document {
    role_subscription;
    status;
    server_count;
    last_login;
    banner_color;
    is_banned;
    banned_by_servers;
};
exports.UserDehive = UserDehive;
__decorate([
    (0, mongoose_1.Prop)({ type: String }),
    __metadata("design:type", Object)
], UserDehive.prototype, "role_subscription", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        enum: ["ACTIVE", "INACTIVE", "BANNED"],
        default: "ACTIVE",
    }),
    __metadata("design:type", String)
], UserDehive.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: 0 }),
    __metadata("design:type", Number)
], UserDehive.prototype, "server_count", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date }),
    __metadata("design:type", Date)
], UserDehive.prototype, "last_login", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String }),
    __metadata("design:type", String)
], UserDehive.prototype, "banner_color", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Boolean, default: false }),
    __metadata("design:type", Boolean)
], UserDehive.prototype, "is_banned", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], UserDehive.prototype, "banned_by_servers", void 0);
exports.UserDehive = UserDehive = __decorate([
    (0, mongoose_1.Schema)({
        collection: "user_dehive",
        timestamps: true,
    })
], UserDehive);
exports.UserDehiveSchema = mongoose_1.SchemaFactory.createForClass(UserDehive);


/***/ }),
/* 27 */
/***/ ((module) => {

module.exports = require("express");

/***/ }),
/* 28 */
/***/ ((module) => {

module.exports = require("path");

/***/ }),
/* 29 */
/***/ ((module) => {

module.exports = require("@nestjs/platform-socket.io");

/***/ }),
/* 30 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.MethodNotAllowedFilter = void 0;
const common_1 = __webpack_require__(2);
let MethodNotAllowedFilter = class MethodNotAllowedFilter {
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        let status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        let message = "Internal server error";
        if (exception instanceof common_1.HttpException) {
            status = exception.getStatus();
            message = exception.message;
        }
        if (status === common_1.HttpStatus.METHOD_NOT_ALLOWED) {
            message = `Method ${request.method} not allowed for ${request.url}`;
        }
        response.status(status).json({
            success: false,
            statusCode: status,
            message,
            timestamp: new Date().toISOString(),
            path: request.url,
        });
    }
};
exports.MethodNotAllowedFilter = MethodNotAllowedFilter;
exports.MethodNotAllowedFilter = MethodNotAllowedFilter = __decorate([
    (0, common_1.Catch)()
], MethodNotAllowedFilter);


/***/ })
/******/ 	]);
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
var exports = __webpack_exports__;

Object.defineProperty(exports, "__esModule", ({ value: true }));
const core_1 = __webpack_require__(1);
const common_1 = __webpack_require__(2);
const config_1 = __webpack_require__(3);
const swagger_1 = __webpack_require__(4);
const channel_call_module_1 = __webpack_require__(5);
const express = __webpack_require__(27);
const path = __webpack_require__(28);
const platform_socket_io_1 = __webpack_require__(29);
const method_not_allowed_filter_1 = __webpack_require__(30);
async function bootstrap() {
    const app = await core_1.NestFactory.create(channel_call_module_1.ChannelCallModule);
    const configService = app.get(config_1.ConfigService);
    app.enableCors({ origin: "*" });
    app.setGlobalPrefix("api");
    app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new method_not_allowed_filter_1.MethodNotAllowedFilter());
    app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));
    app.useWebSocketAdapter(new platform_socket_io_1.IoAdapter(app));
    const config = new swagger_1.DocumentBuilder()
        .setTitle("Dehive - Channel Calling Service")
        .setDescription("REST API for voice channel calls (multiple participants) with WebRTC signaling")
        .setVersion("1.0")
        .addTag("Channel Calls")
        .addTag("TURN/ICE Configuration")
        .addBearerAuth()
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup("api-cc-docs", app, document);
    const port = configService.get("CHANNEL_CALLING_PORT") || 4007;
    const host = configService.get("CLOUD_HOST") || "localhost";
    await app.listen(port, host);
    console.log(`[Dehive] Channel-Calling service running at http://localhost:${port}`);
    console.log(`[Dehive] Swagger UI at http://localhost:${port}/api-cc-docs`);
    console.log(`[Dehive] WebSocket namespace: /channel-rtc`);
}
void bootstrap();

})();

/******/ })()
;