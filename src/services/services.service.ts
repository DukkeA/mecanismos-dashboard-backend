import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { buildPaginationMeta } from '../common/pagination/pagination-meta';

import { slugify } from '../common/strings/slugify';
import type { CreateServiceDto } from './dto/create-service.dto';
import type { ListServicesQueryDto } from './dto/list-services-query.dto';
import type { UpdateServiceDto } from './dto/update-service.dto';
import {
  ServiceCatalogSlugConflictError,
  ServicesRepository,
} from './persistence/services.repository';

@Injectable()
export class ServicesService {
  constructor(private readonly servicesRepository: ServicesRepository) {}

  async create(createServiceDto: CreateServiceDto) {
    const normalizedName = createServiceDto.name.trim();
    const slug = ensureNonEmptySlug(normalizedName);

    try {
      return await this.servicesRepository.create({
        name: normalizedName,
        slug,
        description: normalizeOptionalString(createServiceDto.description),
        isActive: createServiceDto.isActive,
      });
    } catch (error) {
      this.rethrowKnownError(error);
    }
  }

  async findAll(query: ListServicesQueryDto) {
    const result = await this.servicesRepository.findMany(query);

    return {
      data: result.items,
      meta: buildPaginationMeta(result),
    };
  }

  async findOne(id: string) {
    const service = await this.servicesRepository.findById(id);

    if (!service) {
      throw new NotFoundException(`Service ${id} not found`);
    }

    return service;
  }

  async update(id: string, updateServiceDto: UpdateServiceDto) {
    await this.findOne(id);

    const normalizedName = updateServiceDto.name?.trim();
    const slug = normalizedName
      ? ensureNonEmptySlug(normalizedName)
      : undefined;

    try {
      return await this.servicesRepository.update(id, {
        ...(normalizedName !== undefined ? { name: normalizedName } : {}),
        ...(slug !== undefined ? { slug } : {}),
        ...(updateServiceDto.description !== undefined
          ? {
              description: normalizeOptionalString(
                updateServiceDto.description,
              ),
            }
          : {}),
        ...(updateServiceDto.isActive !== undefined
          ? { isActive: updateServiceDto.isActive }
          : {}),
      });
    } catch (error) {
      this.rethrowKnownError(error);
    }
  }

  private rethrowKnownError(error: unknown): never {
    if (error instanceof ServiceCatalogSlugConflictError) {
      throw new ConflictException('Service catalog slug already exists');
    }

    throw error;
  }
}

function normalizeOptionalString(value?: string) {
  const normalized = value?.trim();

  return normalized ? normalized : undefined;
}

function ensureNonEmptySlug(value: string) {
  const slug = slugify(value);

  if (!slug) {
    throw new BadRequestException(
      'Service name must contain letters or numbers',
    );
  }

  return slug;
}
