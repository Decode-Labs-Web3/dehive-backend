import { IoAdapter } from "@nestjs/platform-socket.io";
import { ServerOptions } from "socket.io";

export class RedisIoAdapter extends IoAdapter {
  createIOServer(port: number, options?: ServerOptions): unknown {
    const server = super.createIOServer(port, options);
    return server;
  }
}
