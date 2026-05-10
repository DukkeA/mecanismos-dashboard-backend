import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ExpenseCategory } from '../../../generated/prisma/enums';
import { OptionalTrimmedString } from '../../common/transforms/string.transforms';

const expenseCategories = Object.values(ExpenseCategory);

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

    if (normalized === 'true') {
      return true;
    }

    if (normalized === 'false') {
      return false;
    }

    return value;
  });
}

export class ListExpensesQueryDto {
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

  @ApiPropertyOptional({ example: 'alquiler' })
  @IsOptional()
  @OptionalTrimmedString()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: expenseCategories, example: 'RENT' })
  @IsOptional()
  @IsIn(expenseCategories)
  category?: ExpenseCategory;

  @ApiPropertyOptional({ example: 'cost-center-1' })
  @IsOptional()
  @OptionalTrimmedString()
  @IsString()
  costCenterId?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @OptionalBooleanQuery()
  @IsBoolean()
  isPaid?: boolean;

  @ApiPropertyOptional({ example: '2026-05-01T00:00:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expectedFrom?: Date;

  @ApiPropertyOptional({ example: '2026-05-31T23:59:59.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expectedTo?: Date;

  @ApiPropertyOptional({ example: '2026-05-10T00:00:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  paidFrom?: Date;

  @ApiPropertyOptional({ example: '2026-05-20T23:59:59.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  paidTo?: Date;
}
