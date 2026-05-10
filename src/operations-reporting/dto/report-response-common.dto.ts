import { ApiProperty } from '@nestjs/swagger';

export class ReportWindowDto {
  @ApiProperty({ nullable: true, example: '2026-05-01T00:00:00.000Z' })
  dateFrom!: string | null;

  @ApiProperty({ nullable: true, example: '2026-05-31T23:59:59.000Z' })
  dateTo!: string | null;
}

export class CashOperationalReportDto {
  @ApiProperty({ example: true })
  approximate!: boolean;

  @ApiProperty({ example: 'cash-operational' })
  basis!: 'cash-operational';

  @ApiProperty({ type: ReportWindowDto })
  window!: ReportWindowDto;
}
