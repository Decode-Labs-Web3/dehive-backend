import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import * as FormData from "form-data";

export interface IPFSUploadResult {
  hash: string;
  url: string;
  gatewayUrl: string;
}

@Injectable()
export class IPFSService {
  private readonly logger = new Logger(IPFSService.name);
  private readonly ipfsAddUrl: string;
  private readonly ipfsGatewayUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    // IPFS gateway URLs from environment variables (self-hosted node)
    this.ipfsAddUrl =
      this.configService.get<string>("IPFS_GATEWAY_URL_POST") || "";
    this.ipfsGatewayUrl =
      this.configService.get<string>("IPFS_GATEWAY_URL_GET") || "";
  }

  /**
   * Upload file buffer to IPFS (self-hosted node)
   */
  async uploadFile(
    buffer: Buffer,
    filename: string,
  ): Promise<IPFSUploadResult | null> {
    try {
      const formData = new FormData();
      formData.append("file", buffer, {
        filename,
        contentType: "application/octet-stream",
      });

      this.logger.log(`Uploading ${filename} to IPFS: ${this.ipfsAddUrl}`);

      const response = await firstValueFrom(
        this.httpService.post(this.ipfsAddUrl, formData, {
          headers: formData.getHeaders(),
          timeout: 60000, // 60s timeout for large files
        }),
      );

      if (response.status === 200 && response.data) {
        // Self-hosted IPFS node returns "Hash" field (same as Python code)
        const ipfsHash = response.data.Hash;
        this.logger.log(`Uploaded to IPFS: ${ipfsHash}`);

        return {
          hash: ipfsHash,
          url: `ipfs://${ipfsHash}`,
          gatewayUrl: `${this.ipfsGatewayUrl}/${ipfsHash}`,
        };
      }

      this.logger.error(
        `Failed to upload to IPFS: ${response.status} - ${JSON.stringify(response.data)}`,
      );
      return null;
    } catch (error) {
      this.logger.error(
        `Error uploading to IPFS: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  /**
   * Get IPFS URL from hash
   */
  getIpfsUrl(ipfsHash: string): string {
    return `ipfs://${ipfsHash}`;
  }

  /**
   * Get HTTP gateway URL from hash (for browsers)
   */
  getGatewayUrl(ipfsHash: string): string {
    return `${this.ipfsGatewayUrl}/${ipfsHash}`;
  }
}
