import { PartialType } from '@nestjs/swagger';
import { CreateWorkOrderActualCostDto } from './create-work-order-actual-cost.dto';

export class UpdateWorkOrderActualCostDto extends PartialType(
  CreateWorkOrderActualCostDto,
) {}
