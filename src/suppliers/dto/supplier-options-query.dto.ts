import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { SupplierType } from '../../../generated/prisma/enums';
import { ActiveOptionsQueryDto } from '../../common/reference-data';

const supplierTypes = Object.values(SupplierType);

export class SupplierOptionsQueryDto extends ActiveOptionsQueryDto {
  @ApiPropertyOptional({ enum: supplierTypes, example: 'COMPANY' })
  @IsOptional()
  @IsIn(supplierTypes)
  type?: SupplierType;
}
