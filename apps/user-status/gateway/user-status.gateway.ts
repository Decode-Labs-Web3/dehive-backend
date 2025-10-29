import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Logger } from "@nestjs/common";
import { UserStatusService } from "../src/user-status.service";
import { DecodeApiClient } from "../clients/decode-api.client";
import { Types } from "mongoose";
import { InjectRedis } from "@nestjs-modules/ioredis";
import { Redis } from "ioredis";
import { SessionCacheDoc } from "../interfaces/session-doc.interface";

type SocketMeta = {
  userDehiveId?: string;
  fingerprintHash?: string;
};

@WebSocketGateway({
  cors: { origin: "*" },
})
export class UserStatusGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(UserStatusGateway.name);
  private meta: Map<Socket, SocketMeta>;

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly userStatusService: UserStatusService,
    private readonly decodeApiClient: DecodeApiClient,
  ) {}

  private async findUserSessionFromRedis(
    userId: string,
  ): Promise<string | null> {
    try {
      // Scan all session:* keys in Redis
      const keys = await this.redis.keys("session:*");
      this.logger.log(
        `Scanning Redis for user ${userId}, found ${keys.length} session keys`,
      );

      let foundSessionId: string | null = null;
      let latestExpiresAt: Date | null = null;

      for (const key of keys) {
        const sessionData = await this.redis.get(key);
        if (!sessionData) continue;

        const session: SessionCacheDoc = JSON.parse(sessionData);

        // Check if this session belongs to the user
        // Auth service stores with 'userId', but interface expects '_id'
        const sessionUserId =
          session.user?._id ||
          (session.user as unknown as { userId: string })?.userId;

        if (sessionUserId === userId) {
          // Find the session with latest expires_at (most recent)
          const expiresAt = new Date(session.expires_at);

          if (!latestExpiresAt || expiresAt > latestExpiresAt) {
            latestExpiresAt = expiresAt;
            foundSessionId = key.replace("session:", "");
          }
        }
      }

      if (foundSessionId) {
        this.logger.log(
          `Found latest session for user ${userId}: ${foundSessionId.substring(0, 8)}... (expires: ${latestExpiresAt?.toISOString()})`,
        );
        return foundSessionId;
      }

      this.logger.warn(`No session found in Redis for user ${userId}`);
      return null;
    } catch (error) {
      this.logger.error("Error finding user session from Redis:", error);
      return null;
    }
  }

  private async saveFingerprintToRedis(
    userId: string,
    fingerprintHash: string,
  ): Promise<void> {
    try {
      const key = `user:fingerprint:${userId}`;
      // Save with 24 hour expiry (same as session typically)
      await this.redis.set(key, fingerprintHash, "EX", 86400);
    } catch (error) {
      this.logger.error("Error saving fingerprint to Redis:", error);
    }
  }

  private async getFingerprintFromRedis(
    userId: string,
  ): Promise<string | null> {
    try {
      const key = `user:fingerprint:${userId}`;
      return await this.redis.get(key);
    } catch (error) {
      this.logger.error("Error getting fingerprint from Redis:", error);
      return null;
    }
  }

  private send(client: Socket, event: string, data: unknown) {
    // Production: emit object (default for frontend)
    client.emit(event, data);

    // Debug (Insomnia): uncomment below to emit pretty JSON string
    // const serializedData = JSON.stringify(data, null, 2);
    // client.emit(event, serializedData);
  }

  private broadcastToUsers(event: string, data: unknown, userIds: string[]) {
    if (!this.server || !this.server.sockets) {
      this.logger.warn("Server or sockets not available for broadcast");
      return;
    }

    const sockets = Array.from(this.server.sockets.sockets.values());

    sockets.forEach((socket) => {
      const meta = this.meta.get(socket);
      if (meta?.userDehiveId && userIds.includes(meta.userDehiveId)) {
        this.send(socket, event, data);
      }
    });
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    if (!this.meta) {
      this.meta = new Map<Socket, SocketMeta>();
    }
    this.meta.set(client, { userDehiveId: undefined });
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    if (!this.meta) {
      this.meta = new Map<Socket, SocketMeta>();
    }

    const meta = this.meta.get(client);
    if (meta?.userDehiveId) {
      try {
        const userDehiveId = meta.userDehiveId;

        await this.userStatusService.setUserOffline(userDehiveId);

        this.logger.log(`User ${userDehiveId} is now offline.`);

        const fingerprintHash =
          await this.getFingerprintFromRedis(userDehiveId);
        const sessionId = await this.findUserSessionFromRedis(userDehiveId);

        if (sessionId && fingerprintHash) {
          try {
            const followingData = await this.decodeApiClient.getUserFollowing(
              userDehiveId,
              sessionId,
              fingerprintHash,
            );

            if (followingData && followingData.length > 0) {
              this.logger.log(
                `Broadcasting offline status to ${followingData.length} following users`,
              );

              for (const followingItem of followingData) {
                for (const [socket, socketMeta] of this.meta.entries()) {
                  if (socketMeta.userDehiveId === followingItem.user_id) {
                    this.send(socket, "userStatusChanged", {
                      userId: userDehiveId,
                      status: "offline",
                    });
                  }
                }
              }
            }
          } catch (error) {
            this.logger.error(
              `Error broadcasting offline status for user ${userDehiveId}:`,
              error,
            );
          }
        }
      } catch (error) {
        this.logger.error(
          `Error setting user ${meta.userDehiveId} offline:`,
          error,
        );
      }
    }

    this.meta.delete(client);
  }

  @SubscribeMessage("identity")
  async handleIdentity(
    @MessageBody()
    data: { userDehiveId: string; fingerprintHash: string } | string,
    @ConnectedSocket() client: Socket,
  ) {
    if (!this.meta) {
      this.meta = new Map<Socket, SocketMeta>();
    }

    let userDehiveId: string;
    let fingerprintHash: string;

    if (typeof data === "string") {
      try {
        const parsed = JSON.parse(data);
        userDehiveId = parsed.userDehiveId;
        fingerprintHash = parsed.fingerprintHash;
      } catch (error) {
        this.logger.error("Failed to parse identity data:", error);
        return this.send(client, "error", {
          message: "Invalid identity data format",
          code: "INVALID_REQUEST",
        });
      }
    } else {
      userDehiveId = data.userDehiveId;
      fingerprintHash = data.fingerprintHash;
    }

    this.logger.log(
      `Identity attempt - userDehiveId: ${userDehiveId}, fingerprintHash: ${fingerprintHash ? "provided" : "missing"}`,
    );

    if (!userDehiveId || !fingerprintHash) {
      return this.send(client, "error", {
        message: "userDehiveId and fingerprintHash are required",
        code: "INVALID_REQUEST",
      });
    }

    if (!Types.ObjectId.isValid(userDehiveId)) {
      return this.send(client, "error", {
        message: "Invalid userDehiveId format",
        code: "INVALID_USER_ID",
      });
    }

    try {
      const meta = this.meta.get(client);
      if (meta) {
        meta.userDehiveId = userDehiveId;
        meta.fingerprintHash = fingerprintHash;
      } else {
        this.meta.set(client, { userDehiveId, fingerprintHash });
      }

      await this.saveFingerprintToRedis(userDehiveId, fingerprintHash);

      const sessionId = await this.findUserSessionFromRedis(userDehiveId);

      if (!sessionId) {
        this.logger.warn(
          `No sessionId found for user ${userDehiveId}. Broadcast will be skipped.`,
        );
      } else {
        this.logger.log(
          `Found credentials for user ${userDehiveId} - sessionId: ${sessionId.substring(0, 8)}..., fingerprintHash: provided`,
        );
      }

      // Set user online automatically after identity
      await this.userStatusService.setUserOnline(userDehiveId, client.id);

      this.send(client, "identityConfirmed", {
        userDehiveId,
        status: "online",
      });

      this.logger.log(`User ${userDehiveId} identified and set online.`);

      if (sessionId && fingerprintHash) {
        try {
          const followingData = await this.decodeApiClient.getUserFollowing(
            userDehiveId,
            sessionId,
            fingerprintHash,
          );

          if (followingData && followingData.length > 0) {
            this.logger.log(
              `Broadcasting online status to ${followingData.length} following users`,
            );

            // Log all connected users for debugging
            const connectedUsers = Array.from(this.meta.values())
              .map((meta) => meta.userDehiveId)
              .filter((id) => id);
            this.logger.log(
              `Currently connected users: ${connectedUsers.length} - [${connectedUsers.join(", ")}]`,
            );

            // Broadcast to each following user
            let broadcastCount = 0;
            for (const followingItem of followingData) {
              // Find all connected clients for this following user
              for (const [socket, socketMeta] of this.meta.entries()) {
                if (socketMeta.userDehiveId === followingItem.user_id) {
                  this.send(socket, "userStatusChanged", {
                    userId: userDehiveId,
                    status: "online",
                  });
                  broadcastCount++;
                  this.logger.log(
                    `Sent online notification to user ${followingItem.user_id}`,
                  );
                }
              }
            }
            this.logger.log(
              `Broadcast completed: sent ${broadcastCount} notifications`,
            );
          }
        } catch (error) {
          this.logger.error(
            `Error broadcasting online status for user ${userDehiveId}:`,
            error,
          );
        }
      }
    } catch (error) {
      this.logger.error("Error in identity:", error);
      this.send(client, "error", {
        message: "Failed to identify user",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
