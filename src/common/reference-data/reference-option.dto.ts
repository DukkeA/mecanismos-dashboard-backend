import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type ReferenceOptionContext = Record<
  string,
  string | number | boolean | null
>;

export class ReferenceOptionDto {
  @ApiProperty({ example: 'entity-1' })
  id!: string;

  @ApiProperty({ example: 'Bosch 0445120231' })
  label!: string;

  @ApiPropertyOptional({ example: 'Proveedor principal' })
  description?: string;

  @ApiPropertyOptional({ example: true })
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'ACTIVE' })
  status?: string;

  @ApiPropertyOptional({
    example: { plate: 'ABC123', customerId: 'customer-1' },
    additionalProperties: true,
  })
  context?: ReferenceOptionContext;
}

export type ReferenceOption = ReferenceOptionDto;
