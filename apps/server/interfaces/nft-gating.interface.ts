import { BlockchainNetwork } from "../enum/enum";

export interface NftGatingConfig {
  enabled: boolean;

  network: BlockchainNetwork;

  contract_address: string;

  required_balance: number;
}

export interface NftVerificationResult {
  hasAccess: boolean;

  balance: number;

  required: number;

  message: string;
}
