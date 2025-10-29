import { Injectable, BadRequestException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  ChannelMessage,
  ChannelMessageDocument,
} from "../schemas/channel-message.schema";
import { SearchMessageDto } from "../dto/search-message.dto";
import { SearchResultResponse } from "../interfaces/search-result.interface";
import { DecodeApiClient } from "../clients/decode-api.client";

@Injectable()
export class SearchService {
  constructor(
    @InjectModel(ChannelMessage.name)
    private readonly channelMessageModel: Model<ChannelMessageDocument>,
    private readonly decodeClient: DecodeApiClient,
  ) {}

  async searchInChannel(
    channelId: string,
    searchDto: SearchMessageDto,
    sessionId?: string,
    fingerprintHash?: string,
  ): Promise<SearchResultResponse> {
    const { q, page = 0, limit = 20 } = searchDto;

    if (!q || q.trim().length === 0) {
      throw new BadRequestException("Search query is required");
    }

    if (!Types.ObjectId.isValid(channelId)) {
      throw new BadRequestException("Invalid channelId");
    }

    const skip = page * limit;

    // MongoDB Atlas Search pipeline
    const pipeline = [
      {
        $search: {
          index: "channel_messages_search",
          compound: {
            should: [
              // 1. Exact phrase match (cao nhất)
              {
                phrase: {
                  query: q,
                  path: "content",
                  score: { boost: { value: 3 } },
                },
              },
              // 2. Partial word match (autocomplete - tìm từng phần)
              {
                autocomplete: {
                  query: q,
                  path: "content",
                  score: { boost: { value: 2 } },
                },
              },
              // 3. Fuzzy match (dung sai lỗi chính tả)
              {
                text: {
                  query: q,
                  path: "content",
                  fuzzy: {
                    maxEdits: 1,
                  },
                  score: { boost: { value: 1.5 } },
                },
              },
              // 4. Wildcard match (tìm bất kỳ đâu trong text)
              {
                wildcard: {
                  query: `*${q}*`,
                  path: "content",
                  allowAnalyzedField: true,
                  score: { boost: { value: 1 } },
                },
              },
            ],
            filter: [
              {
                equals: {
                  path: "channelId",
                  value: new Types.ObjectId(channelId),
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
      },
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

    // Count total results BEFORE pagination
    const countPipeline = [...pipeline, { $count: "total" }];
    const countResult = await this.channelMessageModel
      .aggregate(countPipeline)
      .exec();
    const totalResults = countResult[0]?.total || 0;

    // Add pagination
    const paginatedPipeline = [
      ...pipeline,
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          content: 1,
          channelId: 1,
          senderId: 1,
          attachments: 1,
          isEdited: 1,
          isDeleted: 1,
          createdAt: 1,
          score: 1,
        },
      },
    ];

    const messages = await this.channelMessageModel
      .aggregate(paginatedPipeline)
      .exec();

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalResults / limit);
    const hasNextPage = page < totalPages - 1;
    const hasPrevPage = page > 0;

    if (!messages || messages.length === 0) {
      return {
        items: [],
        metadata: {
          page,
          limit,
          total: totalResults,
          totalPages,
          hasNextPage,
          hasPrevPage,
        },
      };
    }

    // Get user profiles
    const userIds = messages
      .map((m) => m.senderId?.toString())
      .filter((id): id is string => Boolean(id));

    console.log("[CHANNEL-MESSAGING-SEARCH] Fetching profiles for:", userIds);

    const profiles = await this.decodeClient.batchGetProfiles(
      userIds,
      sessionId,
      fingerprintHash,
    );

    // Map results with user profiles
    const items = messages.map((msg) => ({
      _id: msg._id,
      channelId: msg.channelId,
      sender: {
        dehive_id: msg.senderId?.toString() || "",
        username:
          profiles[msg.senderId?.toString()]?.username ||
          `User_${msg.senderId}`,
        display_name:
          profiles[msg.senderId?.toString()]?.display_name ||
          `User_${msg.senderId}`,
        avatar_ipfs_hash:
          profiles[msg.senderId?.toString()]?.avatar_ipfs_hash ||
          profiles[msg.senderId?.toString()]?.avatar ||
          null,
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
        limit,
        total: totalResults,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
    };
  }

  async searchInServer(
    serverId: string,
    searchDto: SearchMessageDto,
    userId: string,
    sessionId?: string,
    fingerprintHash?: string,
  ): Promise<SearchResultResponse> {
    const { q, page = 0, limit = 20 } = searchDto;

    if (!q || q.trim().length === 0) {
      throw new BadRequestException("Search query is required");
    }

    if (!Types.ObjectId.isValid(serverId)) {
      throw new BadRequestException("Invalid serverId");
    }

    const skip = page * limit;

    // Search stage with wildcard support
    const searchStage = {
      $search: {
        index: "channel_messages_search",
        compound: {
          should: [
            // Exact match
            {
              text: {
                query: q,
                path: "content",
                score: { boost: { value: 3 } },
              },
            },
            // Wildcard - tìm bất kỳ đâu (QUAN TRỌNG cho partial search)
            {
              wildcard: {
                query: `*${q}*`,
                path: "content",
                allowAnalyzedField: true,
                score: { boost: { value: 2 } },
              },
            },
            // Fuzzy - dung sai lỗi chính tả
            {
              text: {
                query: q,
                path: "content",
                fuzzy: { maxEdits: 1 },
                score: { boost: { value: 1.5 } },
              },
            },
          ],
          filter: [
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

    // Base pipeline without pagination
    const basePipeline = [
      searchStage,
      {
        $addFields: {
          score: { $meta: "searchScore" },
        },
      },
      {
        $lookup: {
          from: "channels",
          localField: "channelId",
          foreignField: "_id",
          as: "channel",
        },
      },
      {
        $unwind: "$channel",
      },
      {
        $match: {
          "channel.server_id": new Types.ObjectId(serverId),
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
    const countResult = await this.channelMessageModel
      .aggregate(countPipeline)
      .exec();
    const totalResults = countResult[0]?.total || 0;

    // Get paginated data
    const dataPipeline = [
      ...basePipeline,
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          content: 1,
          channelId: 1,
          senderId: 1,
          attachments: 1,
          isEdited: 1,
          isDeleted: 1,
          createdAt: 1,
          score: 1,
          "channel.name": 1,
          "channel.server_id": 1,
        },
      },
    ];

    const messages = await this.channelMessageModel
      .aggregate(dataPipeline)
      .exec();

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalResults / limit);
    const hasNextPage = page < totalPages - 1;
    const hasPrevPage = page > 0;

    if (!messages || messages.length === 0) {
      return {
        items: [],
        metadata: {
          page,
          limit,
          total: totalResults,
          totalPages,
          hasNextPage,
          hasPrevPage,
        },
      };
    }

    // Get user profiles
    const userIds = messages
      .map((m) => m.senderId?.toString())
      .filter((id): id is string => Boolean(id));

    console.log(
      "[CHANNEL-MESSAGING-SEARCH] Fetching profiles for server search:",
      userIds,
    );

    const profiles = await this.decodeClient.batchGetProfiles(
      userIds,
      sessionId,
      fingerprintHash,
    );

    const items = messages.map((msg) => ({
      _id: msg._id,
      channelId: msg.channelId,
      sender: {
        dehive_id: msg.senderId?.toString() || "",
        username:
          profiles[msg.senderId?.toString()]?.username ||
          `User_${msg.senderId}`,
        display_name:
          profiles[msg.senderId?.toString()]?.display_name ||
          `User_${msg.senderId}`,
        avatar_ipfs_hash:
          profiles[msg.senderId?.toString()]?.avatar_ipfs_hash ||
          profiles[msg.senderId?.toString()]?.avatar ||
          null,
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
        limit,
        total: totalResults,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
    };
  }
}
