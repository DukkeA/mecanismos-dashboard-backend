import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { buildPaginationMeta } from '../common/pagination/pagination-meta';
import { buildOptionsResponse, type ReferenceOption } from '../common/reference-data';
import type { BrandOptionsQueryDto } from './dto/brand-options-query.dto';
import type { CreateBrandDto } from './dto/create-brand.dto';
import type { ListBrandsQueryDto } from './dto/list-brands-query.dto';
import type { UpdateBrandDto } from './dto/update-brand.dto';
import {
  BrandDuplicateNameError,
  BrandsRepository,
} from './persistence/brands.repository';

@Injectable()
export class BrandsService {
  constructor(private readonly brandsRepository: BrandsRepository) {}

  create(dto: CreateBrandDto) {
    return this.brandsRepository.create(dto);
  }

  async findAll(query: ListBrandsQueryDto) {
    const result = await this.brandsRepository.findMany(query);
    return { data: result.items, meta: buildPaginationMeta(result) };
  }

  async findOptions(query: BrandOptionsQueryDto) {
    const options = await this.brandsRepository.findOptions(query);
    return buildOptionsResponse(options.map(mapBrandOption), query.limit);
  }

  async findOne(id: string) {
    const brand = await this.brandsRepository.findById(id);
    if (!brand) throw new NotFoundException(`Brand ${id} not found`);
    return brand;
  }

  async update(id: string, dto: UpdateBrandDto) {
    await this.findOne(id);

    try {
      return await this.brandsRepository.update(id, dto);
    } catch (error) {
      if (error instanceof BrandDuplicateNameError) {
        throw new ConflictException('Brand name already exists');
      }

      throw error;
    }
  }
}

function mapBrandOption(brand: { id: string; name: string; isActive: boolean }): ReferenceOption {
  return { id: brand.id, label: brand.name, isActive: brand.isActive };
}
