import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateComponentDto } from './create-component.dto';

export class UpdateComponentDto extends PartialType(
  OmitType(CreateComponentDto, [
    'customerId',
    'customer',
    'componentType',
    'vehicle',
    'brandId',
    'brandName',
  ] as const),
) {}
