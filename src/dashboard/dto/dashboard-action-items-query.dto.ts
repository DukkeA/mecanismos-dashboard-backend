import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDate,
  IsOptional,
  ValidationArguments,
  ValidationOptions,
  registerDecorator,
} from 'class-validator';

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function IsActionItemsDateRangeOrderValid(
  validationOptions?: ValidationOptions,
) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isActionItemsDateRangeOrderValid',
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

function parseDateOnly(value: unknown) {
  if (value === undefined || value === null || value instanceof Date) {
    return value;
  }

  if (typeof value !== 'string') {
    return new Date(Number.NaN);
  }

  const match = DATE_ONLY_PATTERN.exec(value);

  if (!match) {
    return new Date(Number.NaN);
  }

  const [, yearValue, monthValue, dayValue] = match;
  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return new Date(Number.NaN);
  }

  return date;
}

export class DashboardActionItemsQueryDto {
  @ApiPropertyOptional({
    description: 'Inclusive start date for action-item selection.',
    example: '2026-05-01',
    format: 'date',
  })
  @IsOptional()
  @Transform(({ value }) => parseDateOnly(value))
  @IsDate({ message: 'from must be a valid YYYY-MM-DD date' })
  from?: Date;

  @ApiPropertyOptional({
    description: 'Inclusive end date for action-item selection.',
    example: '2026-05-31',
    format: 'date',
  })
  @IsOptional()
  @Transform(({ value }) => parseDateOnly(value))
  @IsDate({ message: 'to must be a valid YYYY-MM-DD date' })
  @IsActionItemsDateRangeOrderValid({
    message: 'to must be greater than or equal to from',
  })
  to?: Date;
}
