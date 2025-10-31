import { Injectable, BadRequestException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  DirectMessage,
  DirectMessageDocument,
} from "../../schemas/direct-message.schema";
import { SearchMessageDto } from "../../dto/search-message.dto";
import { SearchResultResponse } from "../../interfaces/search-result.interface";
import { InjectRedis } from "@nestjs-modules/ioredis";
import { Redis } from "ioredis";
import { UserProfile } from "../../interfaces/user-profile.interface";

@Injectable()
export class SearchService {
  constructor(
    @InjectModel(DirectMessage.name)
    private readonly directMessageModel: Model<DirectMessageDocument>,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async searchInConversation(
    conversationId: string,
    searchDto: SearchMessageDto,
    _sessionId?: string,
    _fingerprintHash?: string,
  ): Promise<SearchResultResponse> {
    const { search, page = 0, limit: requestLimit = 30 } = searchDto;

    if (!search || search.trim().length === 0) {
      throw new BadRequestException("Search query is required");
    }

    if (!Types.ObjectId.isValid(conversationId)) {
      throw new BadRequestException("Invalid conversationId");
    }

    const skip = page * requestLimit;

    // Search stage with wildcard support
    const searchStage = {
      $search: {
        index: "direct_messages_search",
        compound: {
          should: [
            // Exact match
            {
              text: {
                query: search,
                path: "content",
                score: { boost: { value: 3 } },
              },
            },
            // Wildcard - tìm bất kỳ đâu (partial search)
            {
              wildcard: {
                query: `*${search}*`,
                path: "content",
                allowAnalyzedField: true,
                score: { boost: { value: 2 } },
              },
            },
            // Fuzzy - dung sai lỗi chính tả
            {
              text: {
                query: search,
                path: "content",
                fuzzy: { maxEdits: 1 },
                score: { boost: { value: 1.5 } },
              },
            },
          ],
          filter: [
            {
              equals: {
                path: "conversationId",
                value: new Types.ObjectId(conversationId),
              },
            },
            {
              equals: {
                path: "isDeleted",
                value: false,
              },
            },
          ],
          minimumShouldMatch: 1,
        },
      },
    };

    const basePipeline = [
      searchStage,
      {
        $addFields: {
          score: { $meta: "searchScore" },
        },
      },
      {
        $sort: {
          score: -1 as const,
          createdAt: -1 as const,
        },
      },
    ];

    // Count total results
    const countPipeline = [...basePipeline, { $count: "total" }];
    const countResult = await this.directMessageModel
      .aggregate(countPipeline)
      .exec();
    const totalResults = countResult[0]?.total || 0;

    // Get paginated data
    const dataPipeline = [
      ...basePipeline,
      { $skip: skip },
      { $limit: requestLimit },
      {
        $project: {
          _id: 1,
          content: 1,
          conversationId: 1,
          senderId: 1,
          attachments: 1,
          isEdited: 1,
          isDeleted: 1,
          createdAt: 1,
          score: 1,
        },
      },
    ];

    const messages = await this.directMessageModel
      .aggregate(dataPipeline)
      .exec();

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalResults / requestLimit);

    if (!messages || messages.length === 0) {
      return {
        items: [],
        metadata: {
          page,
          limit: requestLimit,
          total: 0,
          is_last_page: true,
        },
      };
    }

    // Get user profiles
    const userIds = messages
      .map((m) => m.senderId?.toString())
      .filter((id): id is string => Boolean(id));

    console.log("[DIRECT-MESSAGING-SEARCH] Fetching profiles for:", userIds);

    // Get profiles from cache (Redis)
    const profiles: Record<string, Partial<UserProfile>> = {};
    for (const userId of userIds) {
      const cacheKey = `user_profile:${userId}`;
      const cachedData = await this.redis.get(cacheKey);
      if (cachedData) {
        profiles[userId] = JSON.parse(cachedData);
      }
    }

    // Map results with user profiles

    const items = messages.map((msg) => ({
      _id: msg._id,
      conversationId: msg.conversationId,
      sender: {
        dehive_id: msg.senderId?.toString() || "",
        username:
          profiles[msg.senderId?.toString()]?.username ||
          `User_${msg.senderId}`,
        display_name:
          profiles[msg.senderId?.toString()]?.display_name ||
          `User_${msg.senderId}`,
        avatar_ipfs_hash:
          profiles[msg.senderId?.toString()]?.avatar_ipfs_hash || null,
      },
      content: msg.content,
      attachments: msg.attachments || [],
      isEdited: msg.isEdited || false,
      isDeleted: msg.isDeleted || false,
      createdAt: msg.createdAt,
      score: msg.score,
    }));

    return {
      items,
      metadata: {
        page,
        limit: requestLimit,
        total: totalResults,
        is_last_page: page >= totalPages - 1,
      },
    };
  }
}
