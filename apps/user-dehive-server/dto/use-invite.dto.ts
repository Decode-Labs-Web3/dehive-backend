import { ApiProperty } from '@nestjs/swagger';
export class UseInviteDto {
  @ApiProperty({
    description:
      'This endpoint does not require a request body. The user is identified by the authentication token.',
    example: {},
  })
  _empty?: any;
}
