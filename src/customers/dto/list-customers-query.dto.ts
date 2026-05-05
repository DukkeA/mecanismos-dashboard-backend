import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { CustomerDocumentType } from '../../../generated/prisma/enums';
import { OptionalTrimmedString } from './customer-string.transforms';

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
}
