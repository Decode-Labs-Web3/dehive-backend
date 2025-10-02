import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AuditLogAction } from '../enum/enum';

@Schema({ collection: 'server_audit_log', timestamps: true })
export class ServerAuditLog {
  @Prop({ type: Types.ObjectId, ref: 'Server', required: true })
  server_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'UserDehive', required: true })
  actor_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'UserDehive', required: false })
  target_id?: Types.ObjectId;

  @Prop({ type: String, enum: Object.values(AuditLogAction), required: true })
  action: AuditLogAction;

  @Prop({ type: Object, required: false })
  changes?: Record<string, any>;

  @Prop({ type: String, required: false })
  reason?: string;
}

export type ServerAuditLogDocument = ServerAuditLog & Document;
export const ServerAuditLogSchema =
  SchemaFactory.createForClass(ServerAuditLog);
