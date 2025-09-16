import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { ServerService } from './server.service';
import { CreateServerDto } from '../dto/create-server.dto';
import { UpdateServerDto } from '../dto/update-server.dto';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { CreateChannelDto } from '../dto/create-channel.dto';
import { FakeAuthGuard } from '../guards/fake-auth.guard';
// import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { UpdateChannelDto } from '../dto/update-channel.dto';

interface AuthenticatedRequest extends Request {
  user: { id: string; };
}

@Controller('servers')
//UseGuards(JwtAuthGuard)
@UseGuards(FakeAuthGuard) // Thay bằng JwtAuthGuard khi tích hợp
export class ServerController {
  constructor(private readonly serverService: ServerService) {}


  @Post()
  createServer(@Body() createServerDto: CreateServerDto, @Req() req: AuthenticatedRequest) {
    const ownerId = req.user.id;
    return this.serverService.createServer(createServerDto, ownerId);
  }

  @Get()
  findAllServers() {
    return this.serverService.findAllServers();
  }

  @Get(':id')
  findServerById(@Param('id') id: string) {
    return this.serverService.findServerById(id);
  }

  @Patch(':id')
  updateServer(@Param('id') id: string, @Body() updateServerDto: UpdateServerDto, @Req() req: AuthenticatedRequest) {
    const actorId = req.user.id;
    return this.serverService.updateServer(id, updateServerDto, actorId);
  }

  @Delete(':id')
  removeServer(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const actorId = req.user.id;
    return this.serverService.removeServer(id, actorId);
  }


  @Post(':serverId/categories')
  createCategory(
    @Param('serverId') serverId: string,
    @Body() createCategoryDto: CreateCategoryDto,
    @Req() req: AuthenticatedRequest
  ) {
    const actorId = req.user.id;
    return this.serverService.createCategory(serverId, actorId, createCategoryDto);
  }

  @Get(':serverId/categories')
  findAllCategoriesInServer(@Param('serverId') serverId: string) {
    return this.serverService.findAllCategoriesInServer(serverId);
  }

  @Patch('categories/:categoryId')
  updateCategory(
    @Param('categoryId') categoryId: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @Req() req: AuthenticatedRequest
  ) {
    const actorId = req.user.id;
    return this.serverService.updateCategory(categoryId, actorId, updateCategoryDto);
  }

  @Delete('categories/:categoryId')
  removeCategory(
    @Param('categoryId') categoryId: string,
    @Req() req: AuthenticatedRequest
  ) {
    const actorId = req.user.id;
    return this.serverService.removeCategory(categoryId, actorId);
  }


  @Post(':serverId/categories/:categoryId/channels')
  createChannel(
    @Param('serverId') serverId: string,
    @Param('categoryId') categoryId: string,
    @Body() createChannelDto: CreateChannelDto,
    @Req() req: AuthenticatedRequest
  ) {
    const actorId = req.user.id;
    return this.serverService.createChannel(serverId, categoryId, actorId, createChannelDto);
  }

  @Get('channels/:channelId')
  findChannelById(@Param('channelId') channelId: string) {
    return this.serverService.findChannelById(channelId);
  }

  @Patch('channels/:channelId')
  updateChannel(
    @Param('channelId') channelId: string,
    @Body() updateChannelDto: UpdateChannelDto,
    @Req() req: AuthenticatedRequest
  ) {
    const actorId = req.user.id;
    return this.serverService.updateChannel(channelId, actorId, updateChannelDto);
  }


  @Delete('channels/:channelId')
  removeChannel(
    @Param('channelId') channelId: string,
    @Req() req: AuthenticatedRequest
  ) {
    const actorId = req.user.id;
    return this.serverService.removeChannel(channelId, actorId);
  }

}