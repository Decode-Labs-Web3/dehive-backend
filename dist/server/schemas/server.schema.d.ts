import { Document } from 'mongoose';
export declare class Server {
    name: string;
    description: string;
    owner_id: string;
    member_count: number;
    is_private: boolean;
    tags: string[];
}
export type ServerDocument = Server & Document;
export declare const ServerSchema: import("mongoose").Schema<Server, import("mongoose").Model<Server, any, any, any, Document<unknown, any, Server, any, {}> & Server & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Server, Document<unknown, {}, import("mongoose").FlatRecord<Server>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<Server> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
