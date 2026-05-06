import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import {
  SupplierDocumentType,
  SupplierType,
} from '../../../generated/prisma/enums';
import {
  LowercaseEmail,
  OptionalTrimmedString,
  TrimmedString,
} from './supplier-string.transforms';
import { SupplierPhoneDto } from './supplier-phone.dto';

const supplierTypes = Object.values(SupplierType);
const supplierDocumentTypes = Object.values(SupplierDocumentType);

export class CreateSupplierDto {
  @ApiProperty({ example: 'Repuestos Central' })
  @TrimmedString()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ enum: supplierTypes, example: 'COMPANY' })
  @IsIn(supplierTypes)
  type!: SupplierType;

  @ApiPropertyOptional({ example: 'Laura Perez' })
  @IsOptional()
  @OptionalTrimmedString()
  @IsString()
  contactName?: string;

  @ApiPropertyOptional({ enum: supplierDocumentTypes, example: 'NIT' })
  @IsOptional()
  @IsIn(supplierDocumentTypes)
  documentType?: SupplierDocumentType;

  @ApiPropertyOptional({ example: '900123456' })
  @IsOptional()
  @OptionalTrimmedString()
  @IsString()
  documentNumber?: string;

  @ApiPropertyOptional({ example: 'compras@repuestos.test' })
  @IsOptional()
  @LowercaseEmail()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '<p>Proveedor preferido</p>' })
  @IsOptional()
  @OptionalTrimmedString()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ type: () => [SupplierPhoneDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SupplierPhoneDto)
  phones!: SupplierPhoneDto[];
}
