import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { TrimmedString } from '../../common/transforms/string.transforms';

export class VoidSupplierQuoteDto {
  @ApiProperty({ example: 'Proveedor cotizó una referencia equivocada' })
  @TrimmedString()
  @IsString()
  @IsNotEmpty()
  voidReason!: string;
}
