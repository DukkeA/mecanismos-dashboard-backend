import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CustomerAssetHistorySubjectDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ['CUSTOMER', 'VEHICLE', 'COMPONENT'] })
  scope!: 'CUSTOMER' | 'VEHICLE' | 'COMPONENT';

  @ApiProperty()
  label!: string;

  @ApiPropertyOptional()
  customerId?: string | null;

  @ApiPropertyOptional()
  vehicleId?: string | null;

  @ApiPropertyOptional()
  brand?: string | null;

  @ApiPropertyOptional()
  modelReference?: string | null;

  @ApiPropertyOptional()
  plate?: string | null;

  @ApiPropertyOptional()
  reference?: string | null;

  @ApiPropertyOptional()
  identifier?: string | null;

  @ApiPropertyOptional()
  componentTypeName?: string | null;

  @ApiPropertyOptional()
  name?: string | null;

  @ApiPropertyOptional()
  phone?: string | null;

  @ApiPropertyOptional()
  documentType?: string | null;

  @ApiPropertyOptional()
  documentNumber?: string | null;

  @ApiPropertyOptional()
  email?: string | null;
}

export class CustomerAssetHistoryRelatedAssetDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  label!: string;
}

export class CustomerAssetHistoryRelatedAssetsDto {
  @ApiPropertyOptional({ type: CustomerAssetHistoryRelatedAssetDto })
  customer?: CustomerAssetHistoryRelatedAssetDto | null;

  @ApiPropertyOptional({ type: CustomerAssetHistoryRelatedAssetDto })
  vehicle?: CustomerAssetHistoryRelatedAssetDto | null;

  @ApiProperty({ type: [CustomerAssetHistoryRelatedAssetDto] })
  vehicles!: CustomerAssetHistoryRelatedAssetDto[];

  @ApiProperty({ type: [CustomerAssetHistoryRelatedAssetDto] })
  components!: CustomerAssetHistoryRelatedAssetDto[];
}

export class CustomerAssetHistoryRowLinksDto {
  @ApiProperty()
  workOrderId!: string;

  @ApiProperty()
  customerId!: string;

  @ApiPropertyOptional()
  vehicleId!: string | null;

  @ApiPropertyOptional()
  componentId!: string | null;
}

export class CustomerAssetHistoryAssignedEmployeeDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  type!: string | null;

  @ApiPropertyOptional()
  isActive!: boolean | null;
}

export class CustomerAssetHistoryRowDto {
  @ApiProperty()
  workOrderId!: string;

  @ApiProperty()
  number!: number;

  @ApiProperty()
  type!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  paymentStatus!: string;

  @ApiProperty()
  summary!: string;

  @ApiProperty()
  assetLabel!: string;

  @ApiPropertyOptional()
  createdAt!: string | null;

  @ApiPropertyOptional()
  completedAt!: string | null;

  @ApiPropertyOptional()
  estimatedCollectionAt!: string | null;

  @ApiPropertyOptional()
  latestWorkshopSignal!: string | null;

  @ApiPropertyOptional({ type: CustomerAssetHistoryAssignedEmployeeDto })
  assignedEmployee!: CustomerAssetHistoryAssignedEmployeeDto | null;

  @ApiPropertyOptional()
  payableAmount!: number | null;

  @ApiProperty()
  paidTotal!: number;

  @ApiPropertyOptional()
  balance!: number | null;

  @ApiProperty()
  actualCostTotal!: number;

  @ApiProperty({ type: CustomerAssetHistoryRowLinksDto })
  links!: CustomerAssetHistoryRowLinksDto;
}

export class CustomerAssetHistorySummaryDto {
  @ApiProperty()
  totalWorkOrders!: number;

  @ApiProperty()
  unknownPayableCount!: number;

  @ApiProperty()
  payableAmount!: number;

  @ApiProperty()
  paidTotal!: number;

  @ApiProperty()
  balance!: number;

  @ApiProperty()
  actualCostTotal!: number;
}

export class CustomerAssetHistoryMetaDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class CustomerAssetHistoryResponseDto {
  @ApiProperty({ type: CustomerAssetHistorySubjectDto })
  subject!: CustomerAssetHistorySubjectDto;

  @ApiProperty({ type: CustomerAssetHistoryRelatedAssetsDto })
  relatedAssets!: CustomerAssetHistoryRelatedAssetsDto;

  @ApiProperty({ type: CustomerAssetHistorySummaryDto })
  summary!: CustomerAssetHistorySummaryDto;

  @ApiProperty({ type: [CustomerAssetHistoryRowDto] })
  data!: CustomerAssetHistoryRowDto[];

  @ApiProperty({ type: CustomerAssetHistoryMetaDto })
  meta!: CustomerAssetHistoryMetaDto;
}
