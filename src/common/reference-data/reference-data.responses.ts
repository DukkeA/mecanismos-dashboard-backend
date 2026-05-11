import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReferenceOptionDto } from './reference-option.dto';

export class ReferenceOptionsMetaDto {
  @ApiProperty({ example: 10 })
  limit!: number;

  @ApiPropertyOptional({ example: 42 })
  total?: number;
}

export class ReferenceOptionsResponseDto {
  @ApiProperty({ type: () => [ReferenceOptionDto] })
  data!: ReferenceOptionDto[];

  @ApiPropertyOptional({ type: () => ReferenceOptionsMetaDto })
  meta?: ReferenceOptionsMetaDto;
}

export class QuickCreateMetaDto {
  @ApiPropertyOptional({ example: true })
  incompleteProfile?: boolean;
}

export class QuickCreateResponseDto {
  @ApiProperty({ type: () => ReferenceOptionDto })
  data!: ReferenceOptionDto;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
  })
  entity?: Record<string, unknown>;

  @ApiPropertyOptional({ type: () => QuickCreateMetaDto })
  meta?: QuickCreateMetaDto;
}

export function buildOptionsResponse<T extends ReferenceOptionDto>(
  data: T[],
  limit: number,
  total?: number,
) {
  return {
    data,
    meta: {
      limit,
      ...(total !== undefined ? { total } : {}),
    },
  };
}

export function buildQuickCreateResponse<T extends ReferenceOptionDto, E>(
  data: T,
  entity?: E,
  meta?: QuickCreateMetaDto,
) {
  return {
    data,
    ...(entity !== undefined ? { entity } : {}),
    ...(meta !== undefined ? { meta } : {}),
  };
}
