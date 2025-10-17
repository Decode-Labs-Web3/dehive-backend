import { Controller, Get, Logger } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { ChannelCallService } from "./channel-call.service";

@ApiTags("Channel TURN")
@Controller("channel-turn")
export class ChannelTurnController {
  private readonly logger = new Logger(ChannelTurnController.name);

  constructor(private readonly channelCallService: ChannelCallService) {}

  @Get("ice-servers")
  @ApiOperation({ summary: "Get ICE servers for WebRTC" })
  @ApiResponse({
    status: 200,
    description: "ICE servers retrieved successfully",
  })
  async getIceServers() {
    this.logger.log("Getting ICE servers");
    return await this.channelCallService.getIceServers();
  }

  @Get("credentials")
  @ApiOperation({ summary: "Get TURN server credentials" })
  @ApiResponse({
    status: 200,
    description: "TURN credentials retrieved successfully",
  })
  async getTurnCredentials() {
    this.logger.log("Getting TURN credentials");
    return await this.channelCallService.getTurnCredentials();
  }
}
