import {
  IsBoolean,
  IsEnum,
  IsEthereumAddress,
  IsInt,
  IsOptional,
  Min,
  ValidateIf,
} from "class-validator";
import { BlockchainNetwork } from "../enum/enum";

export class UpdateNftGatingDto {
  @IsBoolean()
  enabled: boolean;

  @ValidateIf((o) => o.enabled === true)
  @IsEnum(BlockchainNetwork, {
    message: "Network must be one of: ethereum, base, bsc",
  })
  network: BlockchainNetwork;

  @ValidateIf((o) => o.enabled === true)
  @IsEthereumAddress({
    message: "contract_address must be a valid Ethereum address",
  })
  contract_address: string;

  @ValidateIf((o) => o.enabled === true)
  @IsInt({ message: "required_balance must be an integer" })
  @Min(1, { message: "required_balance must be at least 1" })
  required_balance: number;
}

export class DisableNftGatingDto {
  @IsBoolean()
  enabled: false;

  @IsOptional()
  network?: never;

  @IsOptional()
  contract_address?: never;

  @IsOptional()
  required_balance?: never;
}
