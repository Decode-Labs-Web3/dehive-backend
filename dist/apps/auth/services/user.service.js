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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const common_1 = require("@nestjs/common");
const decode_api_client_1 = require("../infrastructure/external-services/decode-api.client");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const redis_infrastructure_1 = require("../infrastructure/redis.infrastructure");
let UserService = class UserService {
    decodeApiClient;
    userDehiveModel;
    redis;
    constructor(decodeApiClient, userDehiveModel, redis) {
        this.decodeApiClient = decodeApiClient;
        this.userDehiveModel = userDehiveModel;
        this.redis = redis;
    }
    async getUser(input) {
        const { user_dehive_id, session_id, fingerprint_hashed } = input;
        try {
            const user_decode = await this.getUserDecodeProfile({
                user_id: user_dehive_id,
                session_id,
                fingerprint_hashed,
            });
            if (!user_decode.success || !user_decode.data) {
                return {
                    success: false,
                    message: user_decode.message,
                    statusCode: user_decode.statusCode,
                };
            }
            const user_decode_data = user_decode.data;
            let user_dehive_data = await this.userDehiveModel.findById(user_dehive_id);
            if (!user_dehive_data) {
                const newUserDehive = new this.userDehiveModel({
                    _id: user_dehive_id,
                    user_id: user_dehive_id,
                    bio: '',
                    banner_color: null,
                    server_count: 0,
                    status: 'offline',
                    last_login: new Date(),
                });
                user_dehive_data = await newUserDehive.save();
            }
            const user = {
                _id: user_dehive_data._id,
                dehive_role: user_dehive_data.dehive_role,
                role_subscription: user_dehive_data.role_subscription,
                status: user_dehive_data.status,
                server_count: user_dehive_data.server_count,
                username: user_decode_data.username,
                display_name: user_decode_data.display_name,
                bio: user_decode_data.bio,
                avatar_ipfs_hash: user_decode_data.avatar_ipfs_hash,
                last_login: user_decode_data.last_login,
                primary_wallet: user_decode_data.primary_wallet,
                following_number: user_decode_data.following_number,
                followers_number: user_decode_data.followers_number,
                is_following: user_decode_data.is_following,
                is_follower: user_decode_data.is_follower,
                is_blocked: user_decode_data.is_blocked,
                is_blocked_by: user_decode_data.is_blocked_by,
                mutual_followers_number: user_decode_data.mutual_followers_number,
                mutual_followers_list: user_decode_data.mutual_followers_list,
                is_active: user_decode_data.is_active,
                last_account_deactivation: user_decode_data.last_account_deactivation,
            };
            return {
                success: true,
                message: 'User found',
                statusCode: common_1.HttpStatus.OK,
                data: user,
            };
        }
        catch (error) {
            return {
                success: false,
                message: error.message,
                statusCode: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
            };
        }
    }
    async getMyProfile(input) {
        const { session_id, fingerprint_hashed } = input;
        try {
            const user_decode = await this.getMyDecodeProfile({
                session_id,
                fingerprint_hashed,
            });
            if (!user_decode.success || !user_decode.data) {
                return {
                    success: false,
                    message: user_decode.message,
                    statusCode: common_1.HttpStatus.NOT_FOUND,
                };
            }
            const user_decode_data = user_decode.data;
            let user_dehive_data = await this.userDehiveModel.findById(user_decode_data._id);
            if (!user_dehive_data) {
                const newUserDehive = new this.userDehiveModel({
                    _id: user_decode_data._id,
                    user_id: user_decode_data._id,
                    bio: '',
                    banner_color: null,
                    server_count: 0,
                    status: 'offline',
                    last_login: new Date(),
                });
                user_dehive_data = await newUserDehive.save();
            }
            const user = {
                _id: user_dehive_data._id,
                dehive_role: user_dehive_data.dehive_role,
                role_subscription: user_dehive_data.role_subscription,
                status: user_dehive_data.status,
                server_count: user_dehive_data.server_count,
                username: user_decode_data.username,
                display_name: user_decode_data.display_name,
                bio: user_decode_data.bio,
                avatar_ipfs_hash: user_decode_data.avatar_ipfs_hash,
                last_login: user_decode_data.last_login,
                primary_wallet: user_decode_data.primary_wallet,
                following_number: user_decode_data.following_number,
                followers_number: user_decode_data.followers_number,
                is_following: user_decode_data.is_following,
                is_follower: user_decode_data.is_follower,
                is_blocked: user_decode_data.is_blocked,
                is_blocked_by: user_decode_data.is_blocked_by,
                mutual_followers_number: user_decode_data.mutual_followers_number,
                mutual_followers_list: user_decode_data.mutual_followers_list,
                is_active: user_decode_data.is_active,
                last_account_deactivation: user_decode_data.last_account_deactivation,
            };
            console.log('user service get my decode profile user_decode_data', user_decode_data);
            const redis_cache_data = (await this.redis.get(`session:${session_id}`));
            if (redis_cache_data) {
                redis_cache_data.user =
                    user_decode_data;
                await this.redis.set(`session:${session_id}`, redis_cache_data);
            }
            return {
                success: true,
                message: 'User found',
                statusCode: common_1.HttpStatus.OK,
                data: user,
            };
        }
        catch (error) {
            return {
                success: false,
                message: error.message,
                statusCode: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
            };
        }
    }
    async userExists(user_id) {
        const user_dehive_data = await this.userDehiveModel.findById(user_id);
        if (!user_dehive_data) {
            return {
                success: false,
                message: 'User not found',
                statusCode: common_1.HttpStatus.NOT_FOUND,
            };
        }
        return {
            success: true,
            message: 'User exists',
            statusCode: common_1.HttpStatus.OK,
            data: user_dehive_data ? true : false,
        };
    }
    async getUserDecodeProfile(input) {
        const { user_id, session_id, fingerprint_hashed } = input;
        try {
            const user_decode = await this.decodeApiClient.getUser(user_id, session_id, fingerprint_hashed);
            if (!user_decode.success) {
                return {
                    success: false,
                    message: user_decode.message,
                    statusCode: user_decode.statusCode,
                };
            }
            return user_decode;
        }
        catch (error) {
            return {
                success: false,
                message: error.message,
                statusCode: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
            };
        }
    }
    async getMyDecodeProfile(input) {
        const { session_id, fingerprint_hashed } = input;
        try {
            console.log('user service get my decode profile input', session_id, fingerprint_hashed);
            const user_decode = await this.decodeApiClient.getMyProfile(session_id, fingerprint_hashed);
            if (!user_decode.success) {
                return {
                    success: false,
                    message: user_decode.message,
                    statusCode: user_decode.statusCode,
                };
            }
            return {
                success: true,
                message: 'User found',
                statusCode: common_1.HttpStatus.OK,
                data: user_decode.data,
            };
        }
        catch (error) {
            return {
                success: false,
                message: error.message,
                statusCode: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
            };
        }
    }
};
exports.UserService = UserService;
exports.UserService = UserService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, mongoose_1.InjectModel)('UserDehive')),
    __metadata("design:paramtypes", [decode_api_client_1.DecodeApiClient,
        mongoose_2.Model,
        redis_infrastructure_1.RedisInfrastructure])
], UserService);
//# sourceMappingURL=user.service.js.map