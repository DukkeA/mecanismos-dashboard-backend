import 'reflect-metadata';
import { MODULE_METADATA } from '@nestjs/common/constants';
jest.mock('../prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { AppModule } from '../app.module';
import { AuthModule } from '../auth/auth.module';
import { ComponentsModule } from '../components/components.module';
import { ComponentTypesModule } from '../component-types/component-types.module';
import { CustomersModule } from '../customers/customers.module';
import { InventoryModule } from '../inventory/inventory.module';
import { ProcurementModule } from '../procurement/procurement.module';
import { PrismaModule } from './prisma.module';
import { PrismaService } from '../prisma.service';
import { ServicesModule } from '../services/services.module';
import { SuppliersModule } from '../suppliers/suppliers.module';
import { VehiclesModule } from '../vehicles/vehicles.module';

const prismaConsumers = [
  AuthModule,
  ComponentsModule,
  ComponentTypesModule,
  CustomersModule,
  InventoryModule,
  ProcurementModule,
  ServicesModule,
  SuppliersModule,
  VehiclesModule,
];

describe('PrismaModule architecture', () => {
  it('makes AppModule depend on PrismaModule instead of owning PrismaService directly', () => {
    const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, AppModule) as
      | unknown[]
      | undefined;
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      AppModule,
    ) as unknown[] | undefined;

    expect(imports).toEqual(expect.arrayContaining([PrismaModule]));
    expect(providers ?? []).not.toContain(PrismaService);
  });

  it.each(prismaConsumers)(
    '%p imports PrismaModule without re-declaring PrismaService',
    (moduleClass) => {
      const imports = Reflect.getMetadata(
        MODULE_METADATA.IMPORTS,
        moduleClass,
      ) as unknown[] | undefined;
      const providers = Reflect.getMetadata(
        MODULE_METADATA.PROVIDERS,
        moduleClass,
      ) as unknown[] | undefined;

      expect(imports).toEqual(expect.arrayContaining([PrismaModule]));
      expect(providers ?? []).not.toContain(PrismaService);
    },
  );
});
