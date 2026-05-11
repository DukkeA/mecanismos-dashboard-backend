import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma.service';
import { WorkOrdersController } from './work-orders.controller';
import {
  WORK_ORDERS_PRISMA_CLIENT,
  WorkOrdersRepository,
} from './persistence/work-orders.repository';
import { WorkOrderActualCostsService } from './services/work-order-actual-costs.service';
import { WorkOrderEstimatesService } from './services/work-order-estimates.service';
import { WorkOrderInventoryService } from './services/work-order-inventory.service';
import { WorkOrderLifecycleService } from './services/work-order-lifecycle.service';
import { WorkOrderPaymentsService } from './services/work-order-payments.service';
import { WorkOrderReadModelService } from './services/work-order-read-model.service';
import { WorkOrderRelationsService } from './services/work-order-relations.service';
import { WorkOrdersService } from './work-orders.service';

@Module({
  imports: [PrismaModule],
  controllers: [WorkOrdersController],
  providers: [
    WorkOrdersService,
    WorkOrderLifecycleService,
    WorkOrderEstimatesService,
    WorkOrderActualCostsService,
    WorkOrderInventoryService,
    WorkOrderPaymentsService,
    WorkOrderRelationsService,
    WorkOrderReadModelService,
    WorkOrdersRepository,
    {
      provide: WORK_ORDERS_PRISMA_CLIENT,
      useExisting: PrismaService,
    },
  ],
  exports: [WorkOrdersService],
})
export class WorkOrdersModule {}
