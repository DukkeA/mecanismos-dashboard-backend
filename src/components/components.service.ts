import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { buildPaginationMeta } from '../common/pagination/pagination-meta';
import {
  buildOptionsResponse,
  buildQuickCreateResponse,
  type ReferenceOption,
} from '../common/reference-data';

import type { ComponentOptionsQueryDto } from './dto/component-options-query.dto';
import type { CreateComponentDto } from './dto/create-component.dto';
import type { ListComponentsQueryDto } from './dto/list-components-query.dto';
import type { UpdateComponentDto } from './dto/update-component.dto';
import { ComponentsRepository } from './persistence/components.repository';

@Injectable()
export class ComponentsService {
  constructor(private readonly componentsRepository: ComponentsRepository) {}

  async create(createComponentDto: CreateComponentDto) {
    await this.assertCustomerExists(createComponentDto.customerId);
    await this.assertComponentTypeExists(createComponentDto.componentTypeId);
    await this.assertVehicleOwnership(
      createComponentDto.vehicleId,
      createComponentDto.customerId,
    );

    return this.componentsRepository.create(createComponentDto);
  }

  async findAll(query: ListComponentsQueryDto) {
    const result = await this.componentsRepository.findMany(query);

    return {
      data: result.items,
      meta: buildPaginationMeta(result),
    };
  }

  async findOptions(query: ComponentOptionsQueryDto) {
    const options = await this.componentsRepository.findOptions({
      ...query,
      isActive: query.isActive ?? true,
    });

    return buildOptionsResponse(options.map(mapComponentOption), query.limit);
  }

  async findOne(id: string) {
    const component = await this.componentsRepository.findById(id);

    if (!component) {
      throw new NotFoundException(`Component ${id} not found`);
    }

    return component;
  }

  async update(id: string, updateComponentDto: UpdateComponentDto) {
    const currentComponent = await this.findOne(id);

    await this.assertComponentTypeExists(updateComponentDto.componentTypeId);

    await this.assertVehicleOwnership(
      updateComponentDto.vehicleId,
      currentComponent.customerId,
    );

    return this.componentsRepository.update(id, updateComponentDto);
  }

  async quickCreate(createComponentDto: CreateComponentDto) {
    const component = await this.create(createComponentDto);

    return buildQuickCreateResponse(mapComponentOption(component), component);
  }

  private async assertCustomerExists(customerId: string) {
    const customerExists =
      await this.componentsRepository.customerExists(customerId);

    if (!customerExists) {
      throw new NotFoundException(`Customer ${customerId} not found`);
    }
  }

  private async assertVehicleOwnership(
    vehicleId: string | null | undefined,
    customerId: string,
  ) {
    if (vehicleId === undefined || vehicleId === null) {
      return;
    }

    const vehicle =
      await this.componentsRepository.findVehicleOwnership(vehicleId);

    if (!vehicle) {
      throw new NotFoundException(`Vehicle ${vehicleId} not found`);
    }

    if (vehicle.customerId !== customerId) {
      throw new BadRequestException(
        `Vehicle ${vehicleId} does not belong to customer ${customerId}`,
      );
    }
  }

  private async assertComponentTypeExists(componentTypeId?: string) {
    if (componentTypeId === undefined) {
      return;
    }

    const componentTypeExists =
      await this.componentsRepository.componentTypeExists(componentTypeId);

    if (!componentTypeExists) {
      throw new NotFoundException(
        `Component type ${componentTypeId} not found`,
      );
    }
  }
}

function mapComponentOption(component: {
  id: string;
  customerId: string;
  vehicleId?: string | null;
  brand: string;
  reference: string;
  identifier?: string | null;
  isActive?: boolean;
  componentType: { id: string; name: string };
}): ReferenceOption {
  return {
    id: component.id,
    label:
      component.identifier ??
      `${component.componentType.name} ${component.reference}`,
    description: `${component.brand} · ${component.reference}`,
    context: {
      customerId: component.customerId,
      vehicleId: component.vehicleId ?? null,
      componentTypeId: component.componentType.id,
      componentTypeName: component.componentType.name,
      ...(component.isActive !== undefined
        ? { isActive: component.isActive }
        : {}),
    },
  };
}
