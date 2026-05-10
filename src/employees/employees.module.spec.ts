import 'reflect-metadata';
import { MODULE_METADATA } from '@nestjs/common/constants';
jest.mock('../prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma.service';
import { EmployeesController } from './employees.controller';
import { EmployeesModule } from './employees.module';
import {
  EMPLOYEES_PRISMA_CLIENT,
  EmployeesRepository,
} from './persistence/employees.repository';
import { EmployeesService } from './employees.service';

describe('EmployeesModule', () => {
  it('imports PrismaModule and exposes explicit prisma provider wiring', () => {
    const imports = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      EmployeesModule,
    ) as unknown[];
    const controllers = Reflect.getMetadata(
      MODULE_METADATA.CONTROLLERS,
      EmployeesModule,
    ) as unknown[];
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      EmployeesModule,
    ) as Array<unknown>;

    expect(imports).toEqual(expect.arrayContaining([PrismaModule]));
    expect(controllers).toEqual(expect.arrayContaining([EmployeesController]));
    expect(providers).toEqual(
      expect.arrayContaining([
        EmployeesService,
        EmployeesRepository,
        expect.objectContaining({
          provide: EMPLOYEES_PRISMA_CLIENT,
          useExisting: PrismaService,
        }),
      ]),
    );
  });
});
