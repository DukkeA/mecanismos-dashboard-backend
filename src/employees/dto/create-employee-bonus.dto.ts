import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PaymentMethod } from '../../../generated/prisma/enums';
import { OptionalTrimmedString } from '../../common/transforms/string.transforms';

const paymentMethods = Object.values(PaymentMethod);

export class CreateEmployeeBonusDto {
  @ApiProperty({ example: 150000, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amount!: number;

  @ApiPropertyOptional({ example: 'Bono trimestral' })
  @IsOptional()
  @OptionalTrimmedString()
  @IsString()
  description?: string;

  @ApiProperty({ example: '2026-05-09T10:00:00.000Z' })
  @Type(() => Date)
  @IsDate()
  paidAt!: Date;

  @ApiPropertyOptional({ enum: paymentMethods, example: 'TRANSFER' })
  @IsOptional()
  @IsIn(paymentMethods)
  paymentMethod?: PaymentMethod;
}
