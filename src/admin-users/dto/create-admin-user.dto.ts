import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsString,
  MinLength,
} from 'class-validator';
import { UserRole } from '../../../generated/prisma/enums';
import {
  LowercaseEmail,
  TrimmedString,
} from '../../common/transforms/string.transforms';

const userRoles = Object.values(UserRole);

export class CreateAdminUserDto {
  @ApiProperty({ example: 'usuario@mecanismos.test' })
  @LowercaseEmail()
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Usuario Mecanismos' })
  @TrimmedString()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ enum: userRoles, example: UserRole.SALES })
  @IsIn(userRoles)
  role!: UserRole;

  @ApiProperty({ example: 'Temp1234!', minLength: 8 })
  @TrimmedString()
  @IsString()
  @MinLength(8)
  temporaryPassword!: string;
}
