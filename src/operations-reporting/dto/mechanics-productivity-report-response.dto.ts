import { ApiProperty } from '@nestjs/swagger';
import { CashOperationalReportDto } from './report-response-common.dto';

class MechanicsProductivityReportRowDto {
  @ApiProperty() employeeId!: string;
  @ApiProperty() employeeName!: string;
  @ApiProperty() assignedOrderCount!: number;
  @ApiProperty({ nullable: true }) payableTotal!: number | null;
  @ApiProperty() paidTotal!: number;
  @ApiProperty() actualCosts!: number;
  @ApiProperty({ nullable: true }) grossUtility!: number | null;
  @ApiProperty() unknownPayableCount!: number;
}

export class MechanicsProductivityReportResponseDto extends CashOperationalReportDto {
  @ApiProperty({ type: MechanicsProductivityReportRowDto, isArray: true })
  data!: MechanicsProductivityReportRowDto[];
}
