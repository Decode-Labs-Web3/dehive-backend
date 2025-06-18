import { IsString, IsNotEmpty } from 'class-validator';

export class UseInviteDto {
    @IsNotEmpty()
    @IsString()
    user_dehive_id: string;
}