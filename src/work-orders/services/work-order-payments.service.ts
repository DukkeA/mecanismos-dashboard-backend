import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateWorkOrderPaymentDto } from '../dto/create-work-order-payment.dto';
import { UpdateWorkOrderPaymentDto } from '../dto/update-work-order-payment.dto';
import { WorkOrdersRepository } from '../persistence/work-orders.repository';
import { WorkOrderReadModelService } from './work-order-read-model.service';

@Injectable()
export class WorkOrderPaymentsService {
  constructor(
    private readonly workOrdersRepository: WorkOrdersRepository,
    private readonly workOrderReadModelService: WorkOrderReadModelService,
  ) {}

  async createPayment(id: string, dto: CreateWorkOrderPaymentDto) {
    const workOrder = await this.workOrderReadModelService.findOne(id);

    return this.workOrdersRepository.createPayment(id, dto, workOrder);
  }

  async findPayments(id: string) {
    const workOrder = await this.workOrderReadModelService.findOne(id);

    return workOrder.payments;
  }

  async updatePayment(
    id: string,
    paymentId: string,
    dto: UpdateWorkOrderPaymentDto,
  ) {
    const workOrder = await this.workOrderReadModelService.findOne(id);
    assertPaymentExists(workOrder.payments, paymentId);

    return this.workOrdersRepository.updatePayment(id, paymentId, dto, workOrder);
  }

  async removePayment(id: string, paymentId: string) {
    const workOrder = await this.workOrderReadModelService.findOne(id);
    assertPaymentExists(workOrder.payments, paymentId);

    return this.workOrdersRepository.removePayment(id, paymentId, workOrder);
  }
}

function assertPaymentExists(
  payments: Array<{ id: string }>,
  paymentId: string,
) {
  if (!payments.some((payment) => payment.id === paymentId)) {
    throw new NotFoundException(`Payment ${paymentId} not found`);
  }
}
