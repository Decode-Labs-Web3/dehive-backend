import { Injectable, BadRequestException, Logger } from "@nestjs/common";
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
  private readonly logger = new Logger(SearchService.name);
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
    const { search, page = 0, limit = 20 } = searchDto;

    if (!search || search.trim().length === 0) {
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
                  query: search,
                  path: "content",
                  score: { boost: { value: 3 } },
                },
              },
              // 2. Partial word match (autocomplete - tìm từng phần)
              {
                autocomplete: {
                  query: search,
                  path: "content",
                  score: { boost: { value: 2 } },
                },
              },
              // 3. Fuzzy match (dung sai lỗi chính tả)
              {
                text: {
                  query: search,
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
                  query: `*${search}*`,
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

    // Try Atlas Search aggregation; if unavailable (e.g. not using Atlas Search),
    // fall back to a simple regex-based Mongo find query.
    type SearchMessageRow = {
      _id: unknown;
      channelId: unknown;
      senderId?: unknown;
      content?: string;
      attachments?: unknown[];
      isEdited?: boolean;
      isDeleted?: boolean;
      createdAt?: unknown;
      score?: number | null;
    };

    let totalResults: number;
    let messages: SearchMessageRow[];
    try {
      // Count total results BEFORE pagination
      const countPipeline = [...pipeline, { $count: "total" }];
      const countResult = await this.channelMessageModel
        .aggregate(countPipeline)
        .exec();
      totalResults = countResult[0]?.total || 0;

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

      messages = (await this.channelMessageModel
        .aggregate(paginatedPipeline)
        .exec()) as unknown as SearchMessageRow[];
    } catch (_err) {
      // Log and fallback: regex search on content (case-insensitive)
      console.warn(
        "[CHANNEL-MESSAGING-SEARCH] Atlas $search failed, falling back to regex",
        _err,
      );
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "i");

      const query = {
        channelId: new Types.ObjectId(channelId),
        content: { $regex: regex },
        isDeleted: false,
      } as const;

      totalResults = await this.channelMessageModel.countDocuments(query);
      messages = await this.channelMessageModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec();
      // Since we don't have relevance scores in fallback, set score to null for consistency
      messages = messages.map((m) => ({ ...m, score: 0 }));
    }

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
      .map((m) => (m.senderId ? String(m.senderId) : undefined))
      .filter((id): id is string => Boolean(id));

    console.log("[CHANNEL-MESSAGING-SEARCH] Fetching profiles for:", userIds);

    const profiles = await this.decodeClient.batchGetProfiles(
      userIds,
      sessionId,
      fingerprintHash,
    );

    // Map results with user profiles
    const items = messages.map((m) => {
      const senderKey = m.senderId ? String(m.senderId) : "";
      const profile = profiles[senderKey] || null;
      return {
        _id: m._id as unknown as Types.ObjectId,
        channelId: m.channelId as unknown as Types.ObjectId,
        sender: {
          dehive_id: senderKey,
          username: profile?.username || `User_${senderKey}`,
          display_name: profile?.display_name || `User_${senderKey}`,
          avatar_ipfs_hash:
            profile?.avatar_ipfs_hash || profile?.avatar || null,
        },
        content: m.content ?? "",
        attachments: m.attachments || [],
        isEdited: m.isEdited || false,
        isDeleted: m.isDeleted || false,
        createdAt: (m.createdAt as unknown as Date) ?? new Date(0),
        score: (m.score as number) ?? 0,
      };
    });

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
