import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { ServerAuditLogDocument } from "../../schemas/server-audit-log.schema";
import { AuditLogAction } from "../../enum/enum";

@Injectable()
export class AuditLogService {
  constructor(
    @InjectModel("ServerAuditLog")
    private serverAuditLogModel: Model<ServerAuditLogDocument>,
  ) {}

  async createLog(
    serverId: string,
    action: AuditLogAction,
    actorId: string,
    targetId?: string,
    changes?: Record<string, unknown>,
    reason?: string,
  ): Promise<void> {
    try {
      await this.serverAuditLogModel.create({
        server_id: new Types.ObjectId(serverId),
        action,
        actor_id: new Types.ObjectId(actorId),
        target_id: targetId ? new Types.ObjectId(targetId) : undefined,
        changes,
        reason,
      });
    } catch (error) {
      console.error("Failed to create audit log:", error);
    }
  }

  getModel(): Model<ServerAuditLogDocument> {
    return this.serverAuditLogModel;
  }
}
