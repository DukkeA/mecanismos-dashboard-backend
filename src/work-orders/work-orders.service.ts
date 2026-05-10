import { Injectable } from '@nestjs/common';
import { CreateWorkOrderActualCostDto } from './dto/create-work-order-actual-cost.dto';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { CreateWorkOrderPaymentDto } from './dto/create-work-order-payment.dto';
import { ListWorkOrdersQueryDto } from './dto/list-work-orders-query.dto';
import { UpdateWorkOrderActualCostDto } from './dto/update-work-order-actual-cost.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';
import { UpdateWorkOrderPaymentDto } from './dto/update-work-order-payment.dto';
import { UpsertWorkOrderEstimateDto } from './dto/upsert-work-order-estimate.dto';
import { WorkOrderActualCostsService } from './services/work-order-actual-costs.service';
import { WorkOrderEstimatesService } from './services/work-order-estimates.service';
import { WorkOrderLifecycleService } from './services/work-order-lifecycle.service';
import { WorkOrderPaymentsService } from './services/work-order-payments.service';

@Injectable()
export class WorkOrdersService {
  constructor(
    private readonly workOrderLifecycleService: WorkOrderLifecycleService,
    private readonly workOrderEstimatesService: WorkOrderEstimatesService,
    private readonly workOrderActualCostsService: WorkOrderActualCostsService,
    private readonly workOrderPaymentsService: WorkOrderPaymentsService,
  ) {}

  create(createWorkOrderDto: CreateWorkOrderDto) {
    return this.workOrderLifecycleService.create(createWorkOrderDto);
  }

  findAll(query: ListWorkOrdersQueryDto) {
    return this.workOrderLifecycleService.findAll(query);
  }

  findOne(id: string) {
    return this.workOrderLifecycleService.findOne(id);
  }

  update(id: string, updateWorkOrderDto: UpdateWorkOrderDto) {
    return this.workOrderLifecycleService.update(id, updateWorkOrderDto);
  }

  upsertEstimate(
    id: string,
    phase: string,
    upsertWorkOrderEstimateDto: UpsertWorkOrderEstimateDto,
  ) {
    return this.workOrderEstimatesService.upsertEstimate(
      id,
      phase,
      upsertWorkOrderEstimateDto,
    );
  }

  findEstimates(id: string) {
    return this.workOrderEstimatesService.findEstimates(id);
  }

  createActualCost(
    id: string,
    createWorkOrderActualCostDto: CreateWorkOrderActualCostDto,
  ) {
    return this.workOrderActualCostsService.createActualCost(
      id,
      createWorkOrderActualCostDto,
    );
  }

  findActualCosts(id: string) {
    return this.workOrderActualCostsService.findActualCosts(id);
  }

  updateActualCost(
    id: string,
    costId: string,
    updateWorkOrderActualCostDto: UpdateWorkOrderActualCostDto,
  ) {
    return this.workOrderActualCostsService.updateActualCost(
      id,
      costId,
      updateWorkOrderActualCostDto,
    );
  }

  removeActualCost(id: string, costId: string) {
    return this.workOrderActualCostsService.removeActualCost(id, costId);
  }

  createPayment(
    id: string,
    createWorkOrderPaymentDto: CreateWorkOrderPaymentDto,
  ) {
    return this.workOrderPaymentsService.createPayment(
      id,
      createWorkOrderPaymentDto,
    );
  }

  findPayments(id: string) {
    return this.workOrderPaymentsService.findPayments(id);
  }

  updatePayment(
    id: string,
    paymentId: string,
    updateWorkOrderPaymentDto: UpdateWorkOrderPaymentDto,
  ) {
    return this.workOrderPaymentsService.updatePayment(
      id,
      paymentId,
      updateWorkOrderPaymentDto,
    );
  }

  removePayment(id: string, paymentId: string) {
    return this.workOrderPaymentsService.removePayment(id, paymentId);
  }
}
