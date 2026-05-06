import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { CreateComponentTypeDto } from './dto/create-component-type.dto';
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
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit),
      },
    };
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

function normalizeOptionalString(value?: string) {
  const normalized = value?.trim();

  return normalized ? normalized : undefined;
}
