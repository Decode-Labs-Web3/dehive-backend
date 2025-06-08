import { IsNotEmpty } from 'class-validator';
import { ObjectId } from 'mongoose';

export class DeviceFingerprintDto {
  @IsNotEmpty()
  username_or_email: string;

  fingerprint_hash: string;
}