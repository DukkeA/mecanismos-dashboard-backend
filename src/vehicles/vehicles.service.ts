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
    const customerExists = await this.vehiclesRepository.customerExists(
      createVehicleDto.customerId,
    );

    if (!customerExists) {
      throw new NotFoundException(
        `Customer ${createVehicleDto.customerId} not found`,
      );
    }

    try {
      return await this.vehiclesRepository.create(createVehicleDto);
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
    const options = await this.vehiclesRepository.findOptions(query);

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

    throw error;
  }
}

function mapVehicleOption(vehicle: {
  id: string;
  customerId: string;
  brand: string;
  modelReference: string;
  plate: string;
}): ReferenceOption {
  return {
    id: vehicle.id,
    label: vehicle.plate,
    description: `${vehicle.brand} ${vehicle.modelReference}`,
    context: {
      customerId: vehicle.customerId,
      brand: vehicle.brand,
      modelReference: vehicle.modelReference,
    },
  };
}
