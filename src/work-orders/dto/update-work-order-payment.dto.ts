import { PartialType } from '@nestjs/swagger';
import { CreateWorkOrderPaymentDto } from './create-work-order-payment.dto';

export class UpdateWorkOrderPaymentDto extends PartialType(
  CreateWorkOrderPaymentDto,
) {}
