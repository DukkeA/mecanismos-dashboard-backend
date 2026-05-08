import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { CustomerDocumentType } from '../../../generated/prisma/enums';
import {
  LowercaseEmail,
  OptionalTrimmedString,
  TrimmedString,
} from '../../common/transforms/string.transforms';

const customerDocumentTypes = Object.values(CustomerDocumentType);

export class CreateCustomerDto {
  @ApiProperty({ example: 'Ana Gomez' })
  @TrimmedString()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: '3001234567' })
  @TrimmedString()
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiProperty({ enum: customerDocumentTypes, example: 'CEDULA' })
  @IsIn(customerDocumentTypes)
  documentType!: CustomerDocumentType;

  @ApiProperty({ example: '123456789' })
  @TrimmedString()
  @IsString()
  @IsNotEmpty()
  documentNumber!: string;

  @ApiPropertyOptional({ example: 'ana@mecanismos.test' })
  @IsOptional()
  @LowercaseEmail()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '<p>Cliente frecuente</p>' })
  @IsOptional()
  @OptionalTrimmedString()
  @IsString()
  notes?: string;
}
