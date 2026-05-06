import { PartialType } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateSupplierDto } from './create-supplier.dto';
import { SupplierPhoneDto } from './supplier-phone.dto';

export class UpdateSupplierDto extends PartialType(CreateSupplierDto) {
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SupplierPhoneDto)
  phones?: SupplierPhoneDto[];
}
