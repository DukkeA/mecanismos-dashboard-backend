import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { EmployeeType } from '../../../generated/prisma/enums';
import { ActiveOptionsQueryDto } from '../../common/reference-data';
import { OptionalTrimmedString } from '../../common/transforms/string.transforms';

const employeeTypes = Object.values(EmployeeType);

export class EmployeeOptionsQueryDto extends ActiveOptionsQueryDto {
  @ApiPropertyOptional({ enum: employeeTypes, example: 'MECHANIC' })
  @IsOptional()
  @IsIn(employeeTypes)
  type?: EmployeeType;

  @ApiPropertyOptional({ example: 'cost-center-1' })
  @IsOptional()
  @OptionalTrimmedString()
  @IsString()
  costCenterId?: string;
}
