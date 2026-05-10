import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateWorkOrderPaymentDto } from '../dto/create-work-order-payment.dto';
import { UpdateWorkOrderPaymentDto } from '../dto/update-work-order-payment.dto';
import { WorkOrdersRepository } from '../persistence/work-orders.repository';
import { WorkOrderReadModelService } from './work-order-read-model.service';

@Injectable()
export class WorkOrderPaymentsService {
  private readonly logger = new Logger(WorkOrderPaymentsService.name);

  constructor(
    private readonly workOrdersRepository: WorkOrdersRepository,
    private readonly workOrderReadModelService: WorkOrderReadModelService,
  ) {}

  async createPayment(id: string, dto: CreateWorkOrderPaymentDto) {
    const workOrder = await this.workOrderReadModelService.findOne(id);

    const updatedWorkOrder = await this.workOrdersRepository.createPayment(
      id,
      dto,
      workOrder,
    );

    this.logger.log(
      `Created payment workOrderId=${updatedWorkOrder.id} amount=${dto.amount} paymentStatus=${updatedWorkOrder.paymentStatus}`,
    );

    return updatedWorkOrder;
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

    const updatedWorkOrder = await this.workOrdersRepository.updatePayment(
      id,
      paymentId,
      dto,
      workOrder,
    );

    this.logger.log(
      `Updated payment workOrderId=${updatedWorkOrder.id} paymentId=${paymentId} amount=${dto.amount ?? 'unchanged'} paymentStatus=${updatedWorkOrder.paymentStatus}`,
    );

    return updatedWorkOrder;
  }

  async removePayment(id: string, paymentId: string) {
    const workOrder = await this.workOrderReadModelService.findOne(id);
    assertPaymentExists(workOrder.payments, paymentId);

    const updatedWorkOrder = await this.workOrdersRepository.removePayment(
      id,
      paymentId,
      workOrder,
    );

    this.logger.log(
      `Removed payment workOrderId=${updatedWorkOrder.id} paymentId=${paymentId} paymentStatus=${updatedWorkOrder.paymentStatus}`,
    );

    return updatedWorkOrder;
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
