import { BlockchainNetwork } from "../enum/enum";

export interface NftGatingConfig {
  enabled: boolean;

  network: BlockchainNetwork;

  chain_id: string; // Chain ID for blockchain queries (e.g., "1", "56", "8453")

  contract_address: string;

  required_balance: number;
}

export interface NftVerificationResult {
  hasAccess: boolean;

  balance: number;

  required: number;

  message: string;
}
