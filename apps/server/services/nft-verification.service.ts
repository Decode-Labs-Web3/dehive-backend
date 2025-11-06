import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ethers } from "ethers";
import { BlockchainNetwork } from "../enum/enum";
import { NftVerificationResult } from "../interfaces/nft-gating.interface";

@Injectable()
export class NftVerificationService {
  private readonly logger = new Logger(NftVerificationService.name);
  private readonly providers: Map<BlockchainNetwork, ethers.JsonRpcProvider>;

  // ERC-721 ABI chỉ cần hàm balanceOf
  private readonly ERC721_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
  ];

  constructor(private readonly configService: ConfigService) {
    this.providers = new Map();
    this.initializeProviders();
  }

  private initializeProviders() {
    const ethRpcUrl = this.configService.get<string>("ETH_RPC_URL");
    const baseRpcUrl = this.configService.get<string>("BASE_RPC_URL");
    const bscRpcUrl = this.configService.get<string>("BSC_RPC_URL");

    if (ethRpcUrl) {
      this.providers.set(
        BlockchainNetwork.ETH,
        new ethers.JsonRpcProvider(ethRpcUrl),
      );
      this.logger.log("✅ Ethereum RPC provider initialized");
    } else {
      this.logger.warn("⚠️ ETH_RPC_URL not configured in .env");
    }

    if (baseRpcUrl) {
      this.providers.set(
        BlockchainNetwork.BASE,
        new ethers.JsonRpcProvider(baseRpcUrl),
      );
      this.logger.log("✅ Base RPC provider initialized");
    } else {
      this.logger.warn("⚠️ BASE_RPC_URL not configured in .env");
    }

    if (bscRpcUrl) {
      this.providers.set(
        BlockchainNetwork.BSC,
        new ethers.JsonRpcProvider(bscRpcUrl),
      );
      this.logger.log("✅ BSC RPC provider initialized");
    } else {
      this.logger.warn("⚠️ BSC_RPC_URL not configured in .env");
    }
  }

  async checkNftBalance(
    walletAddress: string,
    contractAddress: string,
    network: BlockchainNetwork,
    requiredBalance: number,
  ): Promise<{
    success: boolean;
    balance: number;
    hasEnough: boolean;
    error?: string;
  }> {
    try {
      this.logger.log(
        `🔍 Checking NFT balance for wallet ${walletAddress} on ${network}`,
      );

      const provider = this.providers.get(network);
      if (!provider) {
        return {
          success: false,
          balance: 0,
          hasEnough: false,
          error: `RPC provider not configured for network: ${network}`,
        };
      }

      if (!ethers.isAddress(walletAddress)) {
        return {
          success: false,
          balance: 0,
          hasEnough: false,
          error: "Invalid wallet address",
        };
      }

      if (!ethers.isAddress(contractAddress)) {
        return {
          success: false,
          balance: 0,
          hasEnough: false,
          error: "Invalid contract address",
        };
      }

      const contract = new ethers.Contract(
        contractAddress,
        this.ERC721_ABI,
        provider,
      );

      const balance = await contract.balanceOf(walletAddress);
      const balanceNumber = Number(balance);

      this.logger.log(
        `✅ NFT Balance: ${balanceNumber} (required: ${requiredBalance})`,
      );

      return {
        success: true,
        balance: balanceNumber,
        hasEnough: balanceNumber >= requiredBalance,
      };
    } catch (error) {
      this.logger.error(
        `❌ Error checking NFT balance: ${error.message}`,
        error.stack,
      );
      return {
        success: false,
        balance: 0,
        hasEnough: false,
        error: error.message,
      };
    }
  }

  async verifyNftAccess(
    walletAddress: string,
    nftGatedConfig: {
      network: BlockchainNetwork;
      contract_address: string;
      required_balance: number;
    },
  ): Promise<NftVerificationResult> {
    const result = await this.checkNftBalance(
      walletAddress,
      nftGatedConfig.contract_address,
      nftGatedConfig.network,
      nftGatedConfig.required_balance,
    );

    if (!result.success) {
      return {
        hasAccess: false,
        balance: 0,
        required: nftGatedConfig.required_balance,
        message: result.error || "Failed to verify NFT ownership",
      };
    }

    if (!result.hasEnough) {
      return {
        hasAccess: false,
        balance: result.balance,
        required: nftGatedConfig.required_balance,
        message: `You need at least ${nftGatedConfig.required_balance} NFT(s) from this collection to join this server. You currently have ${result.balance}.`,
      };
    }

    return {
      hasAccess: true,
      balance: result.balance,
      required: nftGatedConfig.required_balance,
      message: "NFT verification successful",
    };
  }
}
