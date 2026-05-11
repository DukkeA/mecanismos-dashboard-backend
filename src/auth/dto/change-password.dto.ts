import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { TrimmedString } from '../../common/transforms/string.transforms';

export class ChangePasswordDto {
  @ApiProperty({ example: 'Temp1234!', minLength: 8 })
  @TrimmedString()
  @IsString()
  @MinLength(8)
  currentPassword!: string;

  @ApiProperty({ example: 'NewSecure123!', minLength: 8 })
  @TrimmedString()
  @IsString()
  @MinLength(8)
  newPassword!: string;
}
