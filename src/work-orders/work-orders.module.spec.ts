import 'reflect-metadata';
import { MODULE_METADATA } from '@nestjs/common/constants';
jest.mock('../prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma.service';
import { WorkOrderActualCostsService } from './services/work-order-actual-costs.service';
import { WorkOrderEstimatesService } from './services/work-order-estimates.service';
import { WorkOrderLifecycleService } from './services/work-order-lifecycle.service';
import { WorkOrderPaymentsService } from './services/work-order-payments.service';
import { WorkOrderReadModelService } from './services/work-order-read-model.service';
import { WorkOrderRelationsService } from './services/work-order-relations.service';
import { WorkOrdersController } from './work-orders.controller';
import { WorkOrdersModule } from './work-orders.module';
import {
  WORK_ORDERS_PRISMA_CLIENT,
  WorkOrdersRepository,
} from './persistence/work-orders.repository';
import { WorkOrdersService } from './work-orders.service';

describe('WorkOrdersModule', () => {
  it('imports PrismaModule and exposes explicit work-order provider wiring', () => {
    const imports = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      WorkOrdersModule,
    ) as unknown[];
    const controllers = Reflect.getMetadata(
      MODULE_METADATA.CONTROLLERS,
      WorkOrdersModule,
    ) as unknown[];
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      WorkOrdersModule,
    ) as Array<unknown>;
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      WorkOrdersModule,
    ) as unknown[];

    expect(imports).toEqual(expect.arrayContaining([PrismaModule]));
    expect(controllers).toEqual(expect.arrayContaining([WorkOrdersController]));
    expect(providers).toEqual(
      expect.arrayContaining([
        WorkOrdersService,
        WorkOrderLifecycleService,
        WorkOrderEstimatesService,
        WorkOrderActualCostsService,
        WorkOrderPaymentsService,
        WorkOrderRelationsService,
        WorkOrderReadModelService,
        WorkOrdersRepository,
        expect.objectContaining({
          provide: WORK_ORDERS_PRISMA_CLIENT,
          useExisting: PrismaService,
        }),
      ]),
    );
    expect(exportsMetadata).toEqual(
      expect.arrayContaining([WorkOrdersService]),
    );
  });
});
