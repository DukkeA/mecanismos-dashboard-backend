import { ApiProperty } from '@nestjs/swagger';

export class PricingLaborSettingsResponseDto {
  @ApiProperty({ example: 'Mecanismos Tecnicos' })
  companyName!: string;

  @ApiProperty({ example: 'COP', pattern: '^[A-Z]{3}$' })
  currencyCode!: string;

  @ApiProperty({ example: 176, minimum: 1, maximum: 744 })
  monthlyWorkingHours!: number;

  @ApiProperty({ example: 50000, minimum: 0 })
  defaultLaborHourlyRate!: number;

  @ApiProperty({ example: 5, minimum: 0, maximum: 100 })
  saleContingencyPct!: number;

  @ApiProperty({ example: 10, minimum: 0, maximum: 100 })
  workshopContingencyPct!: number;

  @ApiProperty({ example: 20, minimum: 0, maximum: 100 })
  diagnosticContingencyPct!: number;

  @ApiProperty({ example: 20, minimum: 0, maximum: 1000 })
  minimumMarkupPct!: number;

  @ApiProperty({ example: 35, minimum: 0, maximum: 1000 })
  recommendedMarkupPct!: number;

  @ApiProperty({ example: 50, minimum: 0, maximum: 1000 })
  highMarkupPct!: number;

  @ApiProperty({ example: '2026-05-11T08:00:00.000Z', format: 'date-time' })
  updatedAt!: Date;
}
