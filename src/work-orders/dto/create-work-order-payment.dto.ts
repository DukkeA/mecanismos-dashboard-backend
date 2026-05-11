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

export class CreateWorkOrderPaymentDto {
  @ApiProperty({ example: 250000, minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  amount!: number;

  @ApiProperty({ example: '2026-05-10T15:30:00.000Z' })
  @Type(() => Date)
  @IsDate()
  paidAt!: Date;

  @ApiPropertyOptional({ enum: paymentMethods, example: 'CASH' })
  @IsOptional()
  @IsIn(paymentMethods)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ example: 'Anticipo inicial' })
  @IsOptional()
  @OptionalTrimmedString()
  @IsString()
  notes?: string;
}
