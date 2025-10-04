import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Model } from 'mongoose';
import { UserDehiveServer } from '../entities/user-dehive-server.entity';
export declare class IsServerOwnerGuard implements CanActivate {
    private userDehiveServerModel;
    constructor(userDehiveServerModel: Model<UserDehiveServer>);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
export declare class IsMemberGuard implements CanActivate {
    private userDehiveServerModel;
    constructor(userDehiveServerModel: Model<UserDehiveServer>);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
export declare class IsModeratorGuard implements CanActivate {
    private userDehiveServerModel;
    constructor(userDehiveServerModel: Model<UserDehiveServer>);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
