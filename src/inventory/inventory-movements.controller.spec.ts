import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { InventoryMovementsController } from './inventory-movements.controller';
import { InventoryService } from './inventory.service';

describe('InventoryMovementsController', () => {
  const service = {
    findMovement: jest.fn(),
  } as unknown as jest.Mocked<InventoryService>;

  it('exposes read-only movement route and no destructive handlers', () => {
    const controller = new InventoryMovementsController(service);

    expect(controller).toBeDefined();
    expect(
      Reflect.getMetadata(PATH_METADATA, InventoryMovementsController),
    ).toBe('inventory-movements');

    const findOneHandler: unknown = Object.getOwnPropertyDescriptor(
      InventoryMovementsController.prototype,
      'findOne',
    )?.value;

    expect(Reflect.getMetadata(PATH_METADATA, findOneHandler as object)).toBe(
      ':id',
    );
    expect(Reflect.getMetadata(METHOD_METADATA, findOneHandler as object)).toBe(
      RequestMethod.GET,
    );
    expect('update' in controller).toBe(false);
    expect('remove' in controller).toBe(false);
  });
});
