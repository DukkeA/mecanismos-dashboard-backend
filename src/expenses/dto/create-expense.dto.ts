import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  Validate,
} from 'class-validator';
import {
  ExpenseCategory,
  PaymentMethod,
} from '../../../generated/prisma/enums';
import {
  OptionalTrimmedString,
  TrimmedString,
} from '../../common/transforms/string.transforms';

const expenseCategories = Object.values(ExpenseCategory);
const paymentMethods = Object.values(PaymentMethod);

@ValidatorConstraint({ name: 'paymentMethodRequiresPaidAt' })
class PaymentMethodRequiresPaidAtConstraint implements ValidatorConstraintInterface {
  validate(
    paymentMethod: PaymentMethod | undefined,
    args: ValidationArguments,
  ) {
    if (paymentMethod === undefined) {
      return true;
    }

    const object = args.object as { paidAt?: Date };

    return (
      object.paidAt instanceof Date && !Number.isNaN(object.paidAt.getTime())
    );
  }

  defaultMessage() {
    return 'paymentMethod requires paidAt';
  }
}

export class CreateExpenseDto {
  @ApiProperty({ example: 'Arriendo mayo' })
  @TrimmedString()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ enum: expenseCategories, example: 'RENT' })
  @IsIn(expenseCategories)
  category!: ExpenseCategory;

  @ApiProperty({ example: 1500000, minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  amount!: number;

  @ApiProperty({ example: '2026-05-15T00:00:00.000Z' })
  @Type(() => Date)
  @IsDate()
  expectedAt!: Date;

  @ApiPropertyOptional({ example: 'cost-center-1' })
  @IsOptional()
  @OptionalTrimmedString()
  @IsString()
  costCenterId?: string;

  @ApiPropertyOptional({ example: '2026-05-16T00:00:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  paidAt?: Date;

  @ApiPropertyOptional({ enum: paymentMethods, example: 'TRANSFER' })
  @IsOptional()
  @Validate(PaymentMethodRequiresPaidAtConstraint)
  @IsIn(paymentMethods)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ example: 'Pago oficina principal' })
  @IsOptional()
  @OptionalTrimmedString()
  @IsString()
  notes?: string;
}
