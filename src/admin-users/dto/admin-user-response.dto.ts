import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../../generated/prisma/enums';

export class AdminUserResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'usuario@mecanismos.test' })
  email!: string;

  @ApiProperty({ example: 'Usuario Mecanismos' })
  name!: string;

  @ApiProperty({ enum: UserRole })
  role!: UserRole;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  mustChangePassword!: boolean;

  @ApiProperty({ nullable: true })
  lastLoginAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class AdminUserWithTemporaryPasswordDto extends AdminUserResponseDto {
  @ApiProperty({ example: 'Temp1234!' })
  temporaryPassword!: string;
}
