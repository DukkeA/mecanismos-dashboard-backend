import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PricingLaborSettingsHistoryQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}

export class PricingLaborSettingsAuditEntryResponseDto {
  @ApiProperty({ example: 'audit-1' })
  id!: string;

  @ApiProperty({ example: 'seed-user-admin' })
  actorUserId!: string;

  @ApiProperty({ example: ['currencyCode', 'defaultLaborHourlyRate'] })
  changedFields!: string[];

  @ApiProperty({
    example: { currencyCode: 'COP', defaultLaborHourlyRate: 50000 },
  })
  beforeValues!: Record<string, string | number>;

  @ApiProperty({
    example: { currencyCode: 'USD', defaultLaborHourlyRate: 65000 },
  })
  afterValues!: Record<string, string | number>;

  @ApiProperty({ example: '2026-05-11T11:00:00.000Z', format: 'date-time' })
  createdAt!: Date;
}

export class PricingLaborSettingsHistoryMetaDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;
}

export class PricingLaborSettingsHistoryResponseDto {
  @ApiProperty({ type: [PricingLaborSettingsAuditEntryResponseDto] })
  data!: PricingLaborSettingsAuditEntryResponseDto[];

  @ApiProperty({ type: PricingLaborSettingsHistoryMetaDto })
  meta!: PricingLaborSettingsHistoryMetaDto;
}
