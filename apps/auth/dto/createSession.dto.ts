import { IsDate, IsNotEmpty, IsString } from 'class-validator';
import { ObjectId } from 'mongodb';

export class CreateSessionDto {
    @IsNotEmpty()
    jwt_token: string;

    @IsNotEmpty()
    fingerprint_hash: string;

    expires_at: Date;
}
