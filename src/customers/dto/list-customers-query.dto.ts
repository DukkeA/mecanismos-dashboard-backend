import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { CustomerDocumentType } from '../../../generated/prisma/enums';
import { OptionalBooleanQuery } from '../../common/reference-data';
import { OptionalTrimmedString } from '../../common/transforms/string.transforms';
import {
  CUSTOMER_LIST_SORT_DIRECTIONS,
  CUSTOMER_LIST_SORT_FIELDS,
  DEFAULT_CUSTOMER_LIST_SORT,
  type CustomerListSortDirection,
  type CustomerListSortField,
} from '../customer-list-sorting';

const customerDocumentTypes = Object.values(CustomerDocumentType);

export class ListCustomersQueryDto {
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

  @ApiPropertyOptional({ example: 'ana' })
  @IsOptional()
  @OptionalTrimmedString()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: customerDocumentTypes, example: 'CEDULA' })
  @IsOptional()
  @IsIn(customerDocumentTypes)
  documentType?: CustomerDocumentType;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @OptionalBooleanQuery()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    enum: CUSTOMER_LIST_SORT_FIELDS,
    default: DEFAULT_CUSTOMER_LIST_SORT.sortBy,
  })
  @IsOptional()
  @IsIn(CUSTOMER_LIST_SORT_FIELDS)
  sortBy?: CustomerListSortField = DEFAULT_CUSTOMER_LIST_SORT.sortBy;

  @ApiPropertyOptional({
    enum: CUSTOMER_LIST_SORT_DIRECTIONS,
    default: DEFAULT_CUSTOMER_LIST_SORT.sortDir,
  })
  @IsOptional()
  @IsIn(CUSTOMER_LIST_SORT_DIRECTIONS)
  sortDir?: CustomerListSortDirection = DEFAULT_CUSTOMER_LIST_SORT.sortDir;
}
