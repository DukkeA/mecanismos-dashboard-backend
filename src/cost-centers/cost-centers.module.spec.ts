import 'reflect-metadata';
import { MODULE_METADATA } from '@nestjs/common/constants';
jest.mock('../prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma.service';
import { CostCentersController } from './cost-centers.controller';
import { CostCentersModule } from './cost-centers.module';
import {
  COST_CENTERS_PRISMA_CLIENT,
  CostCentersRepository,
} from './persistence/cost-centers.repository';
import { CostCentersService } from './cost-centers.service';

describe('CostCentersModule', () => {
  it('imports PrismaModule and exposes the explicit prisma provider wiring', () => {
    const imports = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      CostCentersModule,
    ) as unknown[];
    const controllers = Reflect.getMetadata(
      MODULE_METADATA.CONTROLLERS,
      CostCentersModule,
    ) as unknown[];
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      CostCentersModule,
    ) as Array<unknown>;

    expect(imports).toEqual(expect.arrayContaining([PrismaModule]));
    expect(controllers).toEqual(
      expect.arrayContaining([CostCentersController]),
    );
    expect(providers).toEqual(
      expect.arrayContaining([
        CostCentersService,
        CostCentersRepository,
        expect.objectContaining({
          provide: COST_CENTERS_PRISMA_CLIENT,
          useExisting: PrismaService,
        }),
      ]),
    );
  });
});
