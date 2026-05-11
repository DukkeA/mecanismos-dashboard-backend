import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { buildPaginationMeta } from '../common/pagination/pagination-meta';
import {
  buildOptionsResponse,
  type ReferenceOption,
} from '../common/reference-data';

import type { CreateComponentTypeDto } from './dto/create-component-type.dto';
import type { ComponentTypeOptionsQueryDto } from './dto/component-type-options-query.dto';
import type { ListComponentTypesQueryDto } from './dto/list-component-types-query.dto';
import type { UpdateComponentTypeDto } from './dto/update-component-type.dto';
import {
  ComponentTypeSlugConflictError,
  ComponentTypesRepository,
} from './persistence/component-types.repository';
import { slugify } from '../common/strings/slugify';

@Injectable()
export class ComponentTypesService {
  constructor(
    private readonly componentTypesRepository: ComponentTypesRepository,
  ) {}

  async create(createComponentTypeDto: CreateComponentTypeDto) {
    const normalizedName = createComponentTypeDto.name.trim();

    try {
      return await this.componentTypesRepository.create({
        name: normalizedName,
        slug: slugify(createComponentTypeDto.slug ?? normalizedName),
        description: normalizeOptionalString(
          createComponentTypeDto.description,
        ),
        isActive: createComponentTypeDto.isActive,
      });
    } catch (error) {
      this.rethrowKnownError(error);
    }
  }

  async findAll(query: ListComponentTypesQueryDto) {
    const result = await this.componentTypesRepository.findMany(query);

    return {
      data: result.items,
      meta: buildPaginationMeta(result),
    };
  }

  async findOptions(query: ComponentTypeOptionsQueryDto) {
    const options = await this.componentTypesRepository.findOptions(query);

    return buildOptionsResponse(options.map(mapComponentTypeOption), query.limit);
  }

  async findOne(id: string) {
    const componentType = await this.componentTypesRepository.findById(id);

    if (!componentType) {
      throw new NotFoundException(`Component type ${id} not found`);
    }

    return componentType;
  }

  async update(id: string, updateComponentTypeDto: UpdateComponentTypeDto) {
    await this.findOne(id);

    const normalizedName = updateComponentTypeDto.name?.trim();
    const normalizedSlugSource = updateComponentTypeDto.slug ?? normalizedName;

    try {
      return await this.componentTypesRepository.update(id, {
        ...(normalizedName !== undefined ? { name: normalizedName } : {}),
        ...(updateComponentTypeDto.description !== undefined
          ? {
              description: normalizeOptionalString(
                updateComponentTypeDto.description,
              ),
            }
          : {}),
        ...(updateComponentTypeDto.isActive !== undefined
          ? { isActive: updateComponentTypeDto.isActive }
          : {}),
        ...(normalizedSlugSource !== undefined
          ? {
              slug: slugify(normalizedSlugSource),
            }
          : {}),
      });
    } catch (error) {
      this.rethrowKnownError(error);
    }
  }

  private rethrowKnownError(error: unknown): never {
    if (error instanceof ComponentTypeSlugConflictError) {
      throw new ConflictException('Component type slug already exists');
    }

    throw error;
  }
}

function mapComponentTypeOption(componentType: {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
}): ReferenceOption {
  return {
    id: componentType.id,
    label: componentType.name,
    description: componentType.description ?? undefined,
    isActive: componentType.isActive,
  };
}

function normalizeOptionalString(value?: string) {
  const normalized = value?.trim();

  return normalized ? normalized : undefined;
}
