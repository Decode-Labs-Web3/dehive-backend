import { IsMongoId, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';
import { Types } from 'mongoose';

export class JoinServerDto {
    @IsNotEmpty()
    @Transform(({ value }) => new Types.ObjectId(value))
    user_dehive_id: Types.ObjectId;

    @IsNotEmpty()
    @Transform(({ value }) => new Types.ObjectId(value))
    server_id: Types.ObjectId;
}