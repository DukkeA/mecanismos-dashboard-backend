import 'reflect-metadata';
import { MODULE_METADATA } from '@nestjs/common/constants';
jest.mock('../prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma.service';
import { ExpensesController } from './expenses.controller';
import { ExpensesModule } from './expenses.module';
import {
  EXPENSES_PRISMA_CLIENT,
  ExpensesRepository,
} from './persistence/expenses.repository';
import { ExpensesService } from './expenses.service';

describe('ExpensesModule', () => {
  it('imports PrismaModule and exposes explicit prisma provider wiring', () => {
    const imports = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      ExpensesModule,
    ) as unknown[];
    const controllers = Reflect.getMetadata(
      MODULE_METADATA.CONTROLLERS,
      ExpensesModule,
    ) as unknown[];
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      ExpensesModule,
    ) as Array<unknown>;

    expect(imports).toEqual(expect.arrayContaining([PrismaModule]));
    expect(controllers).toEqual(expect.arrayContaining([ExpensesController]));
    expect(providers).toEqual(
      expect.arrayContaining([
        ExpensesService,
        ExpensesRepository,
        expect.objectContaining({
          provide: EXPENSES_PRISMA_CLIENT,
          useExisting: PrismaService,
        }),
      ]),
    );
  });
});
