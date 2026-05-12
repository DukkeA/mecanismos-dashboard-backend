import { ApiProperty } from '@nestjs/swagger';

export enum DashboardActionItemCategory {
  WORK_ORDER_OVERDUE = 'WORK_ORDER_OVERDUE',
  RECEIVABLE = 'RECEIVABLE',
  EXPENSE = 'EXPENSE',
  LOW_STOCK = 'LOW_STOCK',
  PRICE_RISK = 'PRICE_RISK',
  CASH_RISK = 'CASH_RISK',
}

export enum DashboardActionItemSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  INFO = 'info',
}

export enum DashboardActionItemDateBasis {
  ESTIMATED_COMPLETION_AT = 'estimatedCompletionAt',
  ESTIMATED_COLLECTION_AT = 'estimatedCollectionAt',
  EXPECTED_AT = 'expectedAt',
  STOCK_AS_OF_TO = 'stock as of range.to',
  ACTIVE_QUOTE_STATE_AS_OF_TO = 'active quote state as of range.to',
  SELECTED_RANGE_COLLECTIONS_VS_PENDING_EXPENSES = 'selected range collections vs pending expenses',
}

class DashboardActionItemsRangeDto {
  @ApiProperty({ example: '2026-05-01', nullable: true })
  from!: string | null;

  @ApiProperty({ example: '2026-05-31', nullable: true })
  to!: string | null;
}

class DashboardActionItemEntityDto {
  @ApiProperty({ example: 'workOrder' })
  type!: string;

  @ApiProperty({ example: 'clx-work-order-id' })
  id!: string;

  @ApiProperty({ example: 'OT 1001 · Acme Industrial SAS' })
  label!: string;

  @ApiProperty({ example: '/work-orders/clx-work-order-id', nullable: true })
  href!: string | null;
}

export class DashboardActionItemDto {
  @ApiProperty({ example: 'WORK_ORDER_OVERDUE:clx-work-order-id' })
  id!: string;

  @ApiProperty({ enum: DashboardActionItemCategory })
  category!: DashboardActionItemCategory;

  @ApiProperty({ enum: DashboardActionItemSeverity })
  severity!: DashboardActionItemSeverity;

  @ApiProperty({ example: 'overdue' })
  status!: string;

  @ApiProperty({ example: 'Work order is overdue' })
  title!: string;

  @ApiProperty({ type: DashboardActionItemEntityDto })
  entity!: DashboardActionItemEntityDto;

  @ApiProperty({ example: '2026-05-31', nullable: true })
  dueAt!: string | null;

  @ApiProperty({ example: 250000, nullable: true })
  amount!: number | null;

  @ApiProperty({ type: [String], example: ['unknownPayable'] })
  riskFlags!: string[];

  @ApiProperty({ enum: DashboardActionItemDateBasis })
  dateBasis!: DashboardActionItemDateBasis;

  @ApiProperty({ type: [String] })
  notes!: string[];
}

class DashboardActionItemCategoryCountsDto {
  @ApiProperty() WORK_ORDER_OVERDUE!: number;
  @ApiProperty() RECEIVABLE!: number;
  @ApiProperty() EXPENSE!: number;
  @ApiProperty() LOW_STOCK!: number;
  @ApiProperty() PRICE_RISK!: number;
  @ApiProperty() CASH_RISK!: number;
}

class DashboardActionItemDateBasisDto {
  @ApiProperty({ enum: DashboardActionItemDateBasis })
  WORK_ORDER_OVERDUE!: DashboardActionItemDateBasis;

  @ApiProperty({ enum: DashboardActionItemDateBasis })
  RECEIVABLE!: DashboardActionItemDateBasis;

  @ApiProperty({ enum: DashboardActionItemDateBasis })
  EXPENSE!: DashboardActionItemDateBasis;

  @ApiProperty({ enum: DashboardActionItemDateBasis })
  LOW_STOCK!: DashboardActionItemDateBasis;

  @ApiProperty({ enum: DashboardActionItemDateBasis })
  PRICE_RISK!: DashboardActionItemDateBasis;

  @ApiProperty({ enum: DashboardActionItemDateBasis })
  CASH_RISK!: DashboardActionItemDateBasis;
}

class DashboardActionItemsMetadataDto {
  @ApiProperty()
  approximate!: boolean;

  @ApiProperty({ example: '2026-05-31T00:00:00.000Z' })
  generatedAt!: string;

  @ApiProperty()
  itemCount!: number;

  @ApiProperty({ type: DashboardActionItemCategoryCountsDto })
  categoryCounts!: DashboardActionItemCategoryCountsDto;

  @ApiProperty({ type: DashboardActionItemDateBasisDto })
  dateBasis!: DashboardActionItemDateBasisDto;

  @ApiProperty({ type: [String] })
  notes!: string[];
}

export class DashboardActionItemsResponseDto {
  @ApiProperty({ type: DashboardActionItemsRangeDto })
  range!: DashboardActionItemsRangeDto;

  @ApiProperty({ type: [DashboardActionItemDto] })
  items!: DashboardActionItemDto[];

  @ApiProperty({ type: DashboardActionItemsMetadataDto })
  metadata!: DashboardActionItemsMetadataDto;
}
