import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { CustomerDocumentType } from '../../../generated/prisma/enums';
import { OptionsQueryDto } from '../../common/reference-data';

const customerDocumentTypes = Object.values(CustomerDocumentType);

export class CustomerOptionsQueryDto extends OptionsQueryDto {
  @ApiPropertyOptional({ enum: customerDocumentTypes, example: 'CEDULA' })
  @IsOptional()
  @IsIn(customerDocumentTypes)
  documentType?: CustomerDocumentType;
}
