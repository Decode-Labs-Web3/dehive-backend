import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({ collection: "ipfs_mapping", timestamps: true })
export class IpfsMapping {
  @Prop({ required: true, index: true })
  contentHash: string; // sha256 hex

  @Prop({ required: true })
  ipfsHash: string; // CID (no ipfs:// prefix)

  @Prop({ required: false })
  gatewayUrl?: string;
}

export type IpfsMappingDocument = IpfsMapping & Document;
export const IpfsMappingSchema = SchemaFactory.createForClass(IpfsMapping);
// unique index on contentHash
IpfsMappingSchema.index({ contentHash: 1 }, { unique: true });
