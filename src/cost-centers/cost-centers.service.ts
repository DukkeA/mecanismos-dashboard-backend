import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { buildPaginationMeta } from '../common/pagination/pagination-meta';
import {
  buildOptionsResponse,
  buildQuickCreateResponse,
  type ReferenceOption,
} from '../common/reference-data';
import type { CostCenterOptionsQueryDto } from './dto/cost-center-options-query.dto';
import type { CreateCostCenterDto } from './dto/create-cost-center.dto';
import type { ListCostCentersQueryDto } from './dto/list-cost-centers-query.dto';
import type { UpdateCostCenterDto } from './dto/update-cost-center.dto';
import {
  CostCenterCodeConflictError,
  CostCentersRepository,
} from './persistence/cost-centers.repository';

@Injectable()
export class CostCentersService {
  constructor(private readonly costCentersRepository: CostCentersRepository) {}

  async create(createCostCenterDto: CreateCostCenterDto) {
    try {
      return await this.costCentersRepository.create({
        code: normalizeCostCenterCode(createCostCenterDto.code),
        name: createCostCenterDto.name.trim(),
        isActive: createCostCenterDto.isActive,
      });
    } catch (error) {
      this.rethrowKnownError(error);
    }
  }

  async findAll(query: ListCostCentersQueryDto) {
    const result = await this.costCentersRepository.findMany(query);

    return {
      data: result.items,
      meta: buildPaginationMeta(result),
    };
  }

  async findOptions(query: CostCenterOptionsQueryDto) {
    const options = await this.costCentersRepository.findOptions(query);

    return buildOptionsResponse(options.map(mapCostCenterOption), query.limit);
  }

  async findOne(id: string) {
    const costCenter = await this.costCentersRepository.findById(id);

    if (!costCenter) {
      throw new NotFoundException(`Cost center ${id} not found`);
    }

    return costCenter;
  }

  async update(id: string, updateCostCenterDto: UpdateCostCenterDto) {
    await this.findOne(id);

    try {
      return await this.costCentersRepository.update(id, {
        ...(updateCostCenterDto.code !== undefined
          ? { code: normalizeCostCenterCode(updateCostCenterDto.code) }
          : {}),
        ...(updateCostCenterDto.name !== undefined
          ? { name: updateCostCenterDto.name.trim() }
          : {}),
        ...(updateCostCenterDto.isActive !== undefined
          ? { isActive: updateCostCenterDto.isActive }
          : {}),
      });
    } catch (error) {
      this.rethrowKnownError(error);
    }
  }

  async quickCreate(createCostCenterDto: CreateCostCenterDto) {
    const costCenter = await this.create(createCostCenterDto);

    return buildQuickCreateResponse(
      mapCostCenterOption(costCenter),
      costCenter,
    );
  }

  private rethrowKnownError(error: unknown): never {
    if (error instanceof CostCenterCodeConflictError) {
      throw new ConflictException('Cost center code already exists');
    }

    throw error;
  }
}

function normalizeCostCenterCode(value: string) {
  return value.trim().toUpperCase();
}

function mapCostCenterOption(costCenter: {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}): ReferenceOption {
  return {
    id: costCenter.id,
    label: `${costCenter.code} · ${costCenter.name}`,
    description: costCenter.name,
    isActive: costCenter.isActive,
    context: {
      code: costCenter.code,
    },
  };
}
