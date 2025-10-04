import { Model } from 'mongoose';
import { UserDehive } from '../schemas/user-dehive.schema';
import { Response } from '../interfaces/response.interface';
import { UserDehiveDoc } from '../interfaces/user-doc.interface';
export declare class RegisterService {
    private readonly userDehiveModel;
    constructor(userDehiveModel: Model<UserDehive>);
    register(user_id: string): Promise<Response<UserDehiveDoc>>;
}
