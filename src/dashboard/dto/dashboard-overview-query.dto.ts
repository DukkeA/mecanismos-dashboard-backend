import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsOptional,
  ValidationArguments,
  ValidationOptions,
  registerDecorator,
} from 'class-validator';

function IsDateRangeOrderValid(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isDateRangeOrderValid',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
            return true;
          }

          const from = (args.object as { from?: Date }).from;

          if (!(from instanceof Date) || Number.isNaN(from.getTime())) {
            return true;
          }

          return from.getTime() <= value.getTime();
        },
      },
    });
  };
}

export class DashboardOverviewQueryDto {
  @ApiPropertyOptional({ example: '2026-05-01T00:00:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @ApiPropertyOptional({ example: '2026-05-31T23:59:59.999Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  @IsDateRangeOrderValid({
    message: 'to must be greater than or equal to from',
  })
  to?: Date;
}
