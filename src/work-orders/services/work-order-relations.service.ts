import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateWorkOrderDto } from '../dto/create-work-order.dto';
import { UpdateWorkOrderDto } from '../dto/update-work-order.dto';
import {
  WorkOrderDetail,
  WorkOrdersRepository,
} from '../persistence/work-orders.repository';

type ResolvedWorkOrderRelations = {
  customer: Awaited<ReturnType<WorkOrdersRepository['findCustomerById']>>;
  vehicle: Awaited<ReturnType<WorkOrdersRepository['findVehicleById']>>;
  component: Awaited<ReturnType<WorkOrdersRepository['findComponentById']>>;
  assignedEmployee: Awaited<ReturnType<WorkOrdersRepository['findEmployeeById']>>;
};

@Injectable()
export class WorkOrderRelationsService {
  constructor(private readonly workOrdersRepository: WorkOrdersRepository) {}

  assertCreateRelations(
    createWorkOrderDto: CreateWorkOrderDto,
  ): Promise<ResolvedWorkOrderRelations> {
    return this.resolveRelations({
      customerId: createWorkOrderDto.customerId,
      vehicleId: createWorkOrderDto.vehicleId,
      componentId: createWorkOrderDto.componentId,
      assignedEmployeeId: createWorkOrderDto.assignedEmployeeId,
    });
  }

  assertUpdateRelations(
    currentWorkOrder: WorkOrderDetail,
    updateWorkOrderDto: UpdateWorkOrderDto,
  ): Promise<ResolvedWorkOrderRelations> {
    return this.resolveRelations({
      customerId: updateWorkOrderDto.customerId ?? currentWorkOrder.customerId,
      vehicleId: coalesceRelationUpdate(
        updateWorkOrderDto.vehicleId,
        currentWorkOrder.vehicleId,
      ),
      componentId: coalesceRelationUpdate(
        updateWorkOrderDto.componentId,
        currentWorkOrder.componentId,
      ),
      assignedEmployeeId: coalesceRelationUpdate(
        updateWorkOrderDto.assignedEmployeeId,
        currentWorkOrder.assignedEmployeeId,
      ),
    });
  }

  private async resolveRelations(input: {
    customerId: string;
    vehicleId?: string | null;
    componentId?: string | null;
    assignedEmployeeId?: string | null;
  }): Promise<ResolvedWorkOrderRelations> {
    const customerId = input.customerId.trim();
    const customer = await this.workOrdersRepository.findCustomerById(customerId);

    if (!customer) {
      throw new NotFoundException(`Customer ${customerId} not found`);
    }

    const vehicleId = normalizeOptionalId(input.vehicleId);
    const componentId = normalizeOptionalId(input.componentId);
    const assignedEmployeeId = normalizeOptionalId(input.assignedEmployeeId);

    const vehicle = vehicleId
      ? await this.workOrdersRepository.findVehicleById(vehicleId)
      : null;

    if (vehicleId && !vehicle) {
      throw new NotFoundException(`Vehicle ${vehicleId} not found`);
    }

    if (vehicle && vehicle.customerId !== customerId) {
      throw new BadRequestException(
        `Vehicle ${vehicle.id} does not belong to customer ${customerId}`,
      );
    }

    const component = componentId
      ? await this.workOrdersRepository.findComponentById(componentId)
      : null;

    if (componentId && !component) {
      throw new NotFoundException(`Component ${componentId} not found`);
    }

    if (component && component.customerId !== customerId) {
      throw new BadRequestException(
        `Component ${component.id} does not belong to customer ${customerId}`,
      );
    }

    if (component && vehicleId && component.vehicleId && component.vehicleId !== vehicleId) {
      throw new BadRequestException(
        `Component ${component.id} does not belong to vehicle ${vehicleId}`,
      );
    }

    const assignedEmployee = assignedEmployeeId
      ? await this.workOrdersRepository.findEmployeeById(assignedEmployeeId)
      : null;

    if (assignedEmployeeId && !assignedEmployee) {
      throw new NotFoundException(
        `Employee ${assignedEmployeeId} not found`,
      );
    }

    return {
      customer,
      vehicle,
      component,
      assignedEmployee,
    };
  }
}

function coalesceRelationUpdate(
  nextValue: string | undefined,
  currentValue: string | null,
) {
  return nextValue === undefined ? currentValue : nextValue;
}

function normalizeOptionalId(value?: string | null) {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}
