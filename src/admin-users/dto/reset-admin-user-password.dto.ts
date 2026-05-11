import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { TrimmedString } from '../../common/transforms/string.transforms';

export class ResetAdminUserPasswordDto {
  @ApiProperty({ example: 'Reset1234!', minLength: 8 })
  @TrimmedString()
  @IsString()
  @MinLength(8)
  temporaryPassword!: string;
}
