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
import type { CreateVehicleDto } from './dto/create-vehicle.dto';
import type { ListVehiclesQueryDto } from './dto/list-vehicles-query.dto';
import type { UpdateVehicleDto } from './dto/update-vehicle.dto';
import type { VehicleOptionsQueryDto } from './dto/vehicle-options-query.dto';
import {
  VehicleDuplicatePlateError,
  VehiclesRepository,
} from './persistence/vehicles.repository';

@Injectable()
export class VehiclesService {
  constructor(private readonly vehiclesRepository: VehiclesRepository) {}

  async create(createVehicleDto: CreateVehicleDto) {
    if (usesResolvedRelations(createVehicleDto)) {
      try {
        return await this.vehiclesRepository.createWithResolvedRelations(
          createVehicleDto,
        );
      } catch (error) {
        this.rethrowKnownError(error);
      }
    }

    const customerExists = await this.vehiclesRepository.customerExists(
      createVehicleDto.customerId!,
    );

    if (!customerExists) {
      throw new NotFoundException(
        `Customer ${createVehicleDto.customerId} not found`,
      );
    }

    try {
      return await this.vehiclesRepository.create({
        ...createVehicleDto,
        customerId: createVehicleDto.customerId!,
        brand: createVehicleDto.brand!,
      });
    } catch (error) {
      this.rethrowKnownError(error);
    }
  }

  async findAll(query: ListVehiclesQueryDto) {
    const result = await this.vehiclesRepository.findMany(query);

    return {
      data: result.items,
      meta: buildPaginationMeta(result),
    };
  }

  async findOptions(query: VehicleOptionsQueryDto) {
    const options = await this.vehiclesRepository.findOptions({
      ...query,
      isActive: query.isActive ?? true,
    });

    return buildOptionsResponse(options.map(mapVehicleOption), query.limit);
  }

  async findOne(id: string) {
    const vehicle = await this.vehiclesRepository.findById(id);

    if (!vehicle) {
      throw new NotFoundException(`Vehicle ${id} not found`);
    }

    return vehicle;
  }

  async update(id: string, updateVehicleDto: UpdateVehicleDto) {
    await this.findOne(id);

    try {
      return await this.vehiclesRepository.update(id, updateVehicleDto);
    } catch (error) {
      this.rethrowKnownError(error);
    }
  }

  async quickCreate(createVehicleDto: CreateVehicleDto) {
    const vehicle = await this.create(createVehicleDto);

    return buildQuickCreateResponse(mapVehicleOption(vehicle), vehicle);
  }

  private rethrowKnownError(error: unknown): never {
    if (error instanceof VehicleDuplicatePlateError) {
      throw new ConflictException('Vehicle plate already exists');
    }

    if (error instanceof Error && /^(Customer|Brand) .+ not found$/.test(error.message)) {
      throw new NotFoundException(error.message);
    }

    throw error;
  }
}

function usesResolvedRelations(createVehicleDto: CreateVehicleDto) {
  return Boolean(
    createVehicleDto.customer ||
      createVehicleDto.brandId ||
      createVehicleDto.brandName ||
      createVehicleDto.brand,
  );
}

function mapVehicleOption(vehicle: {
  id: string;
  customerId: string;
  brand: string;
  modelReference: string;
  plate: string;
  isActive?: boolean;
}): ReferenceOption {
  return {
    id: vehicle.id,
    label: vehicle.plate,
    description: `${vehicle.brand} ${vehicle.modelReference}`,
    context: {
      customerId: vehicle.customerId,
      brand: vehicle.brand,
      modelReference: vehicle.modelReference,
      ...(vehicle.isActive !== undefined ? { isActive: vehicle.isActive } : {}),
    },
  };
}
