import { Injectable, BadRequestException } from "@nestjs/common";

export interface NetworkInfo {
  chainId: string;
  name: string;
  scanUrl: string;
  nativeCurrency: string;
  rpcUrl?: string;
}

@Injectable()
export class NetworkMappingService {
  private readonly networkMap: Map<string, NetworkInfo> = new Map([
    [
      "ethereum",
      {
        chainId: "1",
        name: "Ethereum Mainnet",
        scanUrl: "https://etherscan.io",
        nativeCurrency: "ETH",
      },
    ],
    [
      "bsc",
      {
        chainId: "56",
        name: "BNB Smart Chain",
        scanUrl: "https://bscscan.com",
        nativeCurrency: "BNB",
      },
    ],
    [
      "base",
      {
        chainId: "8453",
        name: "Base",
        scanUrl: "https://basescan.org",
        nativeCurrency: "ETH",
      },
    ],
  ]);

  /**
   * Get chain ID from network name
   * @param networkName - "ethereum" | "bsc" | "base"
   * @returns chain ID as string
   */
  getChainId(networkName: string): string {
    const network = this.networkMap.get(networkName.toLowerCase());
    if (!network) {
      throw new BadRequestException(
        `❌ Unsupported network: ${networkName}. Supported: ${this.getSupportedNetworks().join(", ")}`,
      );
    }
    return network.chainId;
  }

  /**
   * Get network info from network name
   */
  getNetworkInfo(networkName: string): NetworkInfo {
    const network = this.networkMap.get(networkName.toLowerCase());
    if (!network) {
      throw new BadRequestException(
        `❌ Unsupported network: ${networkName}. Supported: ${this.getSupportedNetworks().join(", ")}`,
      );
    }
    return network;
  }

  /**
   * Get network name from chain ID
   */
  getNetworkName(chainId: string): string {
    for (const [name, info] of this.networkMap.entries()) {
      if (info.chainId === chainId) {
        return name;
      }
    }
    throw new BadRequestException(`❌ Unknown chain ID: ${chainId}`);
  }

  /**
   * Get all supported networks
   */
  getSupportedNetworks(): string[] {
    return Array.from(this.networkMap.keys());
  }

  /**
   * Validate if network is supported
   */
  isNetworkSupported(networkName: string): boolean {
    return this.networkMap.has(networkName.toLowerCase());
  }
}
