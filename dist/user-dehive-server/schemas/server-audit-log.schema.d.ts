import { Document, Types } from 'mongoose';
import { AuditLogAction } from '../enum/enum';
export declare class ServerAuditLog {
    server_id: Types.ObjectId;
    actor_id: Types.ObjectId;
    target_id?: Types.ObjectId;
    action: AuditLogAction;
    changes?: Record<string, any>;
    reason?: string;
}
export type ServerAuditLogDocument = ServerAuditLog & Document;
export declare const ServerAuditLogSchema: import("mongoose").Schema<ServerAuditLog, import("mongoose").Model<ServerAuditLog, any, any, any, Document<unknown, any, ServerAuditLog, any, {}> & ServerAuditLog & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ServerAuditLog, Document<unknown, {}, import("mongoose").FlatRecord<ServerAuditLog>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<ServerAuditLog> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
