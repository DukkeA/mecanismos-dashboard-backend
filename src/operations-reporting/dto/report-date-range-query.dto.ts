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

          const dateFrom = (args.object as { dateFrom?: Date }).dateFrom;

          if (!(dateFrom instanceof Date) || Number.isNaN(dateFrom.getTime())) {
            return true;
          }

          return dateFrom.getTime() <= value.getTime();
        },
      },
    });
  };
}

export class ReportDateRangeQueryDto {
  @ApiPropertyOptional({ example: '2026-05-01T00:00:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateFrom?: Date;

  @ApiPropertyOptional({ example: '2026-05-31T23:59:59.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  @IsDateRangeOrderValid({
    message: 'dateTo must be greater than or equal to dateFrom',
  })
  dateTo?: Date;
}
