import { Types } from 'mongoose';
export interface IServer {
    readonly _id?: Types.ObjectId;
    readonly name: string;
    readonly description?: string;
    readonly server_icon_ipfs_hash?: string;
    readonly server_banner_ipfs_hash?: string;
    readonly owner_id: Types.ObjectId;
    readonly createdAt?: Date;
    readonly updatedAt?: Date;
}
