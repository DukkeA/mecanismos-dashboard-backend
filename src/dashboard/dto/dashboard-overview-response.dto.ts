import { ApiProperty } from '@nestjs/swagger';
import { EmployeeMonthlyPayrollStatus } from '../../../generated/prisma/enums';

class DashboardRangeDto {
  @ApiProperty({ nullable: true }) from!: string | null;
  @ApiProperty({ nullable: true }) to!: string | null;
}

class DashboardWorkOrdersKpiDto {
  @ApiProperty() open!: number;
  @ApiProperty() completed!: number;
  @ApiProperty() paused!: number;
  @ApiProperty() cancelled!: number;
}

class DashboardCashKpiDto {
  @ApiProperty() collected!: number;
  @ApiProperty() actualCosts!: number;
  @ApiProperty() paidExpenses!: number;
  @ApiProperty() pendingExpenses!: number;
  @ApiProperty({ nullable: true }) pendingReceivables!: number | null;
  @ApiProperty({ nullable: true }) approximateUtility!: number | null;
}

class DashboardInventoryKpiDto {
  @ApiProperty() lowStockCount!: number;
}

class DashboardPayrollKpiDto {
  @ApiProperty({ nullable: true }) grandTotal!: number | null;
  @ApiProperty({ enum: EmployeeMonthlyPayrollStatus, nullable: true })
  status!: EmployeeMonthlyPayrollStatus | null;
  @ApiProperty({ nullable: true }) monthLabel!: string | null;
}

class DashboardKpisDto {
  @ApiProperty({ type: DashboardWorkOrdersKpiDto })
  workOrders!: DashboardWorkOrdersKpiDto;

  @ApiProperty({ type: DashboardCashKpiDto })
  cash!: DashboardCashKpiDto;

  @ApiProperty({ type: DashboardInventoryKpiDto })
  inventory!: DashboardInventoryKpiDto;

  @ApiProperty({ type: DashboardPayrollKpiDto })
  payroll!: DashboardPayrollKpiDto;
}

class DashboardCoverageProgressDto {
  @ApiProperty() paid!: number;
  @ApiProperty() expected!: number;
  @ApiProperty({ nullable: true }) ratio!: number | null;
  @ApiProperty() remaining!: number;
}

class DashboardPayrollCoverageProgressDto {
  @ApiProperty() covered!: number;
  @ApiProperty() payrollTotal!: number;
  @ApiProperty({ nullable: true }) ratio!: number | null;
  @ApiProperty() remaining!: number;
}

class DashboardReceivablesProgressDto {
  @ApiProperty() collected!: number;
  @ApiProperty() knownPayable!: number;
  @ApiProperty({ nullable: true }) ratio!: number | null;
  @ApiProperty({ nullable: true }) remaining!: number | null;
  @ApiProperty() unknownPayableCount!: number;
}

class DashboardProgressDto {
  @ApiProperty({ type: DashboardCoverageProgressDto })
  expenseCoverage!: DashboardCoverageProgressDto;

  @ApiProperty({ type: DashboardPayrollCoverageProgressDto })
  payrollCoverage!: DashboardPayrollCoverageProgressDto;

  @ApiProperty({ type: DashboardReceivablesProgressDto })
  receivablesCollection!: DashboardReceivablesProgressDto;
}

class DashboardAlertPreviewItemDto {
  @ApiProperty() id!: string;
  @ApiProperty() label!: string;
  @ApiProperty({ nullable: true }) amount!: number | null;
  @ApiProperty({ nullable: true }) occurredAt!: string | null;
}

class DashboardAlertPreviewsDto {
  @ApiProperty({ type: [DashboardAlertPreviewItemDto] })
  pendingReceivables!: DashboardAlertPreviewItemDto[];

  @ApiProperty({ type: [DashboardAlertPreviewItemDto] })
  pendingExpenses!: DashboardAlertPreviewItemDto[];

  @ApiProperty({ type: [DashboardAlertPreviewItemDto] })
  lowStockItems!: DashboardAlertPreviewItemDto[];
}

class DashboardAlertsDto {
  @ApiProperty() pendingReceivables!: number;
  @ApiProperty() pendingExpensesDue!: number;
  @ApiProperty() lowStockItems!: number;
  @ApiProperty() unknownPayables!: number;
  @ApiProperty({ type: DashboardAlertPreviewsDto })
  previews!: DashboardAlertPreviewsDto;
}

class DashboardRecentActivityItemDto {
  @ApiProperty() type!: string;
  @ApiProperty() occurredAt!: string;
  @ApiProperty() label!: string;
  @ApiProperty({ nullable: true }) amount!: number | null;
}

class DashboardSectionDateBasisDto {
  @ApiProperty() workOrders!: string;
  @ApiProperty() cash!: string;
  @ApiProperty() inventory!: string;
  @ApiProperty() payroll!: string;
  @ApiProperty() recentActivity!: string;
}

class DashboardMetadataDto {
  @ApiProperty() approximate!: boolean;
  @ApiProperty() basis!: string;
  @ApiProperty({ type: [String] }) notes!: string[];
  @ApiProperty({ type: DashboardSectionDateBasisDto })
  sectionDateBasis!: DashboardSectionDateBasisDto;
}

export class DashboardOverviewResponseDto {
  @ApiProperty({ type: DashboardRangeDto })
  range!: DashboardRangeDto;

  @ApiProperty({ type: DashboardKpisDto })
  kpis!: DashboardKpisDto;

  @ApiProperty({ type: DashboardProgressDto })
  progress!: DashboardProgressDto;

  @ApiProperty({ type: DashboardAlertsDto })
  alerts!: DashboardAlertsDto;

  @ApiProperty({ type: [DashboardRecentActivityItemDto] })
  recentActivity!: DashboardRecentActivityItemDto[];

  @ApiProperty({ type: DashboardMetadataDto })
  metadata!: DashboardMetadataDto;
}
