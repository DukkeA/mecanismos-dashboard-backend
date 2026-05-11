import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { UserRole } from '../../../generated/prisma/enums';
import { OptionalTrimmedString } from '../../common/transforms/string.transforms';

const userRoles = Object.values(UserRole);

function OptionalBooleanQuery() {
  return Transform(({ value }: { value: unknown }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value !== 'string') {
      return value;
    }

    const normalized = value.trim().toLowerCase();

    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
    return value;
  });
}

export class ListAdminUsersQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 10, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;

  @ApiPropertyOptional({ example: 'admin' })
  @IsOptional()
  @OptionalTrimmedString()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: userRoles, example: UserRole.ADMIN })
  @IsOptional()
  @IsIn(userRoles)
  role?: UserRole;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @OptionalBooleanQuery()
  @IsBoolean()
  isActive?: boolean;
}
