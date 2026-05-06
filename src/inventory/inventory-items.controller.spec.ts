import { RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { MODULE_METADATA } from '@nestjs/common/constants';
jest.mock('../prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { ROLES_KEY } from '../auth/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { AppModule } from '../app.module';
import { ProcurementService } from '../procurement/procurement.service';
import { InventoryItemsController } from './inventory-items.controller';
import { InventoryModule } from './inventory.module';
import { InventoryService } from './inventory.service';

describe('InventoryItemsController', () => {
  const inventoryService = {
    createItem: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    listItemMovements: jest.fn(),
    createMovement: jest.fn(),
  } as unknown as jest.Mocked<InventoryService>;
  const procurementService = {
    findItemQuoteLookup: jest.fn(),
  } as unknown as jest.Mocked<ProcurementService>;

  let controller: InventoryItemsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new InventoryItemsController(
      inventoryService,
      procurementService,
    );
  });

  it('registers inventory item routes, guards, quote lookup, and app wiring', async () => {
    inventoryService.createItem.mockResolvedValue({ id: 'item-1' } as never);
    inventoryService.findAll.mockResolvedValue({ data: [], meta: {} } as never);
    inventoryService.findOne.mockResolvedValue({ id: 'item-1' } as never);
    inventoryService.listItemMovements.mockResolvedValue([] as never);
    inventoryService.createMovement.mockResolvedValue({
      id: 'movement-1',
    } as never);
    procurementService.findItemQuoteLookup.mockResolvedValue({
      latestBySupplier: [],
      history: [],
    });

    await expect(controller.findSupplierQuotes('item-1')).resolves.toEqual({
      latestBySupplier: [],
      history: [],
    });

    expect(Reflect.getMetadata(PATH_METADATA, InventoryItemsController)).toBe(
      'inventory-items',
    );
    expect(Reflect.getMetadata(ROLES_KEY, InventoryItemsController)).toEqual([
      'ADMIN',
      'SALES',
    ]);
    expect(
      Reflect.getMetadata(GUARDS_METADATA, InventoryItemsController),
    ).toEqual([JwtAuthGuard, RolesGuard]);

    const quoteLookupHandler: unknown = Object.getOwnPropertyDescriptor(
      InventoryItemsController.prototype,
      'findSupplierQuotes',
    )?.value;

    expect(
      Reflect.getMetadata(PATH_METADATA, quoteLookupHandler as object),
    ).toBe(':id/supplier-quotes');
    expect(
      Reflect.getMetadata(METHOD_METADATA, quoteLookupHandler as object),
    ).toBe(RequestMethod.GET);

    const appModuleImports = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      AppModule,
    ) as unknown[];

    expect(appModuleImports).toContain(InventoryModule);
  });
});
