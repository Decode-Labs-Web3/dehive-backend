import { IsMongoId, IsNotEmpty, IsBoolean } from 'class-validator';

export class UpdateNotificationDto {
    @IsNotEmpty()
    @IsMongoId()
    user_dehive_id: string;

    @IsNotEmpty()
    @IsMongoId()
    server_id: string;

    @IsNotEmpty()
    @IsBoolean()
    is_muted: boolean;
}