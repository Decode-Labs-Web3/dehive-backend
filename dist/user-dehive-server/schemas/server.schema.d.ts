import { Document, Types } from 'mongoose';
export declare class Server {
    name: string;
    description: string;
    owner_id: Types.ObjectId;
    member_count: number;
    is_private: boolean;
    tags: string[];
}
export type ServerDocument = Server & Document;
export declare const ServerSchema: import("mongoose").Schema<Server, import("mongoose").Model<Server, any, any, any, Document<unknown, any, Server, any> & Server & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Server, Document<unknown, {}, import("mongoose").FlatRecord<Server>, {}> & import("mongoose").FlatRecord<Server> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
