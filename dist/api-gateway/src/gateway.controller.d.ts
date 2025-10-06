import { Request, Response } from 'express';
import { GatewayService } from './gateway.service';
export declare class GatewayController {
    private readonly gatewayService;
    private readonly logger;
    constructor(gatewayService: GatewayService);
    getHealth(res: Response): Promise<void>;
    getServices(res: Response): Promise<void>;
    refreshServices(res: Response): Promise<void>;
    handleAllRequests(req: Request, res: Response): Promise<void>;
    private determineService;
    private getServicePath;
}
