import { HttpStatus, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
// Schemas
import { UserDehive } from "../schemas/user-dehive.schema";

// Interfaces
import { Response } from "../interfaces/response.interface";
import { UserDehiveDoc } from "../interfaces/user-doc.interface";

@Injectable()
export class RegisterService {
  constructor(
    @InjectModel("UserDehive")
    private readonly userDehiveModel: Model<UserDehive>,
  ) {}

  async register(user_id: string): Promise<Response<UserDehiveDoc>> {
    const create_user = await this.userDehiveModel.create({
      _id: user_id,
    });
    return {
      success: true,
      statusCode: HttpStatus.CREATED,
      message: "User created",
      data: create_user as unknown as UserDehiveDoc,
    };
  }
}
