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
import { Types } from "mongoose";

type SocketMeta = {
  userDehiveId?: string;
};

@WebSocketGateway({
  namespace: "/status",
  cors: { origin: "*" },
})
export class UserStatusGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(UserStatusGateway.name);
  private meta: Map<Socket, SocketMeta>;

  constructor(private readonly service: UserStatusService) {
    this.meta = new Map<Socket, SocketMeta>();
  }

  private send(client: Socket, event: string, data: unknown) {
    client.emit(event, data);
  }

  private broadcast(event: string, data: unknown, excludeSocketId?: string) {
    if (excludeSocketId) {
      this.server.except(excludeSocketId).emit(event, data);
    } else {
      this.server.emit(event, data);
    }
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
        await this.service.setUserOffline(meta.userDehiveId);

        this.broadcast("userOffline", {
          user_id: meta.userDehiveId,
          status: "offline",
          last_seen: new Date(),
        });

        this.logger.log(`User ${meta.userDehiveId} is now offline`);
      } catch (error) {
        this.logger.error(
          `Error setting user ${meta.userDehiveId} offline:`,
          error,
        );
      }
    }

    this.meta.delete(client);
  }

  @SubscribeMessage("setOnline")
  async handleSetOnline(
    @MessageBody() data: { userDehiveId: string } | string,
    @ConnectedSocket() client: Socket,
  ) {
    if (!this.meta) {
      this.meta = new Map<Socket, SocketMeta>();
    }

    let userDehiveId: string;

    if (typeof data === "string") {
      try {
        const parsed = JSON.parse(data);
        userDehiveId = parsed.userDehiveId;
      } catch {
        userDehiveId = data;
      }
    } else {
      userDehiveId = data.userDehiveId;
    }

    if (!userDehiveId) {
      return this.send(client, "error", {
        message: "userDehiveId is required",
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
      } else {
        this.meta.set(client, { userDehiveId });
      }

      await this.service.setUserOnline(userDehiveId, client.id);

      this.send(client, "statusUpdated", {
        user_id: userDehiveId,
        status: "online",
      });

      this.broadcast(
        "userOnline",
        {
          user_id: userDehiveId,
          status: "online",
        },
        client.id,
      );

      this.logger.log(`User ${userDehiveId} is now online`);
    } catch (error) {
      this.logger.error("Error in setOnline:", error);
      this.send(client, "error", {
        message: "Failed to set online status",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  @SubscribeMessage("setAway")
  async handleSetAway(
    @MessageBody() data: { userDehiveId: string } | string,
    @ConnectedSocket() client: Socket,
  ) {
    let userDehiveId: string;

    if (typeof data === "string") {
      try {
        const parsed = JSON.parse(data);
        userDehiveId = parsed.userDehiveId;
      } catch {
        userDehiveId = data;
      }
    } else {
      userDehiveId = data.userDehiveId;
    }

    if (!userDehiveId) {
      return this.send(client, "error", {
        message: "userDehiveId is required",
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
      await this.service.setUserAway(userDehiveId);

      this.send(client, "statusUpdated", {
        user_id: userDehiveId,
        status: "away",
      });

      this.broadcast(
        "userAway",
        {
          user_id: userDehiveId,
          status: "away",
        },
        client.id,
      );

      this.logger.log(`User ${userDehiveId} is now away`);
    } catch (error) {
      this.logger.error("Error in setAway:", error);
      this.send(client, "error", {
        message: "Failed to set away status",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  @SubscribeMessage("checkStatus")
  async handleCheckStatus(
    @MessageBody()
    data: { user_ids: string[]; include_profile?: boolean } | string,
    @ConnectedSocket() client: Socket,
  ) {
    let userIds: string[];
    let includeProfile = false;

    if (typeof data === "string") {
      try {
        const parsed = JSON.parse(data);
        userIds = parsed.user_ids;
        includeProfile = parsed.include_profile || false;
      } catch {
        return this.send(client, "error", {
          message: "Invalid JSON format",
          code: "INVALID_FORMAT",
        });
      }
    } else {
      userIds = data.user_ids;
      includeProfile = data.include_profile || false;
    }

    if (!userIds || !Array.isArray(userIds)) {
      return this.send(client, "error", {
        message: "user_ids array is required",
        code: "INVALID_REQUEST",
      });
    }

    try {
      const result = await this.service.getBulkUserStatus(
        userIds,
        includeProfile,
      );

      this.send(client, "statusResult", result);
    } catch (error) {
      this.logger.error("Error in checkStatus:", error);
      this.send(client, "error", {
        message: "Failed to check status",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
