import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { UserRole } from '../../../generated/prisma/enums';
import { OptionalTrimmedString } from '../../common/transforms/string.transforms';

const userRoles = Object.values(UserRole);

function OptionalBooleanBody() {
  return Transform(({ value }: { value: unknown }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    return value;
  });
}

export class UpdateAdminUserDto {
  @ApiPropertyOptional({ example: 'Usuario Actualizado' })
  @IsOptional()
  @OptionalTrimmedString()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: userRoles, example: UserRole.ADMIN })
  @IsOptional()
  @IsIn(userRoles)
  role?: UserRole;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @OptionalBooleanBody()
  @IsBoolean()
  isActive?: boolean;
}
