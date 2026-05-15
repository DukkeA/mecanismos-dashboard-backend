import { OmitType } from '@nestjs/swagger';
import { ListBrandsQueryDto } from './list-brands-query.dto';

export class BrandOptionsQueryDto extends OmitType(ListBrandsQueryDto, [
  'page',
] as const) {}
