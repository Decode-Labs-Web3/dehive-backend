import { IsMongoId, IsNotEmpty, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { Types } from 'mongoose';

export class UpdateNotificationDto {
    @IsNotEmpty()
    @IsMongoId()
    @Transform(({ value }) => new Types.ObjectId(value))
    user_dehive_id: Types.ObjectId;

    @IsNotEmpty()
    @IsMongoId()
    @Transform(({ value }) => new Types.ObjectId(value))
    server_id: Types.ObjectId;

    @IsNotEmpty()
    @IsBoolean()
    @Transform(({ value }) => Boolean(value))
    is_muted: boolean;
}