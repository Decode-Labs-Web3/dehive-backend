import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from '../schemas/user.schema';
import { UserAvatar } from '../schemas/user_avatar.schema';
import { JwtService } from '@nestjs/jwt';
import { EditUserDto } from '../dto/editUser.dto';
import { AvatarChangeDto } from '../dto/avatarChange.dto';
@Injectable()
export class UserService {
  constructor(@InjectModel(User.name) private userModel: Model<User>, @InjectModel(UserAvatar.name) private avatarModel: Model<UserAvatar>, private readonly jwtService: JwtService) {}


  // view my profile
  async viewMyProfile(accessToken: string) {
    const decoded = this.jwtService.verify(accessToken);  
    const user = await this.userModel.findById(decoded.id);
    console.log('viewMyProfile user', user);
    if (!user) {
      return {
        statusCode: 404,
        message: 'User not found',
      }
    }
    const userProfile = {
      id: user._id,
      email: user.email,
      username: user.username,
      display_name: user.display_name,
      biography: user.biography,
      primary_wallet: user.primary_wallet ? user.primary_wallet.toString() : "N/A",
      created_at: user.created_at,
    }
    return userProfile;
  }

  async viewUserPublicProfile(userId: string, accessToken: string) {
    const decoded = this.jwtService.verify(accessToken);
    const userRequester = await this.userModel.findById(decoded.id);
    if (!userRequester) {
      return {
        statusCode: 404,
        message: 'User Requester not found',
      }
    }
    const userRequested = await this.userModel.findById(userId);
    if (!userRequested) {
      return {
        statusCode: 404,
        message: 'User Requested not found',
      }
    }
    const userRequestedProfile = {
      id: userRequested._id,
      email: userRequested.email,
      username: userRequested.username,
      display_name: userRequested.display_name,
      biography: userRequested.biography,
      primary_wallet: userRequested.primary_wallet ? userRequested.primary_wallet.toString() : "N/A",
      created_at: userRequested.created_at,
    }

    return userRequestedProfile;
  }

  async checkUsername(username: string, accessToken: string) {
    const decoded = this.jwtService.verify(accessToken);
    const user = await this.userModel.findById(decoded.id);
    if (!user) {
      return {
        statusCode: 404,
        message: 'User not found',
      }
    }
    const username_request = await this.userModel.findOne({ username });
    if (username_request) {
      return {
        statusCode: 400,
        message: 'Username already exists',
      }
    }
    return {
      statusCode: 200,
      message: 'Username is available',
    } 
  }

  async editUser(payload: any, accessToken: string) {
    const decoded = this.jwtService.verify(accessToken);
    console.log('SERVICE DEBUG editUser decoded', decoded);
    console.log('SERVICE DEBUG editUser payload', payload);
    const user = await this.userModel.findById(decoded.id);
    if (!user) {
      return {
        statusCode: 404,
        message: 'User not found',
      }
    }
    
    if (payload.username) {
      const checkUsername = await this.checkUsername(payload.username, accessToken);
      if (checkUsername.statusCode !== 200) {
        return checkUsername;
      }
      user.username = payload.username;
    }
    if (payload.display_name) {
      user.display_name = payload.display_name;
    }
    if (payload.biography) {
      user.biography = payload.biography;
    }
    user.updated_at = new Date();
    console.log('user changed', user);
    await user.save();
    return user;
  }
}
