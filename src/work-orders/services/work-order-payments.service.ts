import { Injectable, NotImplementedException } from '@nestjs/common';
import { CreateWorkOrderPaymentDto } from '../dto/create-work-order-payment.dto';
import { UpdateWorkOrderPaymentDto } from '../dto/update-work-order-payment.dto';
import { WorkOrdersRepository } from '../persistence/work-orders.repository';

@Injectable()
export class WorkOrderPaymentsService {
  constructor(private readonly workOrdersRepository: WorkOrdersRepository) {
    void this.workOrdersRepository;
  }

  createPayment(_id: string, _dto: CreateWorkOrderPaymentDto) {
    throw new NotImplementedException('Lane 6 implements payment creation');
  }

  findPayments(_id: string) {
    throw new NotImplementedException('Lane 6 implements payment reads');
  }

  updatePayment(_id: string, _paymentId: string, _dto: UpdateWorkOrderPaymentDto) {
    throw new NotImplementedException('Lane 6 implements payment updates');
  }

  removePayment(_id: string, _paymentId: string) {
    throw new NotImplementedException('Lane 6 implements payment deletion');
  }
}
