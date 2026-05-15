import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateVehicleDto } from './create-vehicle.dto';
import { ListVehiclesQueryDto } from './list-vehicles-query.dto';
import { VehicleOptionsQueryDto } from './vehicle-options-query.dto';

describe('Vehicle lifecycle DTOs', () => {
  it('transforms valid lifecycle query strings and rejects invalid values', () => {
    const inactiveList = plainToInstance(ListVehiclesQueryDto, {
      isActive: 'false',
    });
    const activeOptions = plainToInstance(VehicleOptionsQueryDto, {
      isActive: 'true',
    });
    const invalidQuery = plainToInstance(ListVehiclesQueryDto, {
      isActive: 'inactive',
    });

    expect(validateSync(inactiveList)).toHaveLength(0);
    expect(inactiveList.isActive).toBe(false);
    expect(validateSync(activeOptions)).toHaveLength(0);
    expect(activeOptions.isActive).toBe(true);
    expect(validateSync(invalidQuery)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ property: 'isActive' }),
      ]),
    );
  });

  it('accepts boolean lifecycle state in vehicle bodies and rejects non-booleans', () => {
    const inactiveBody = plainToInstance(CreateVehicleDto, {
      customerId: 'customer-1',
      brand: 'Mazda',
      modelReference: 'CX5',
      plate: 'ABC123',
      isActive: false,
    });
    const invalidBody = plainToInstance(CreateVehicleDto, {
      customerId: 'customer-1',
      brand: 'Mazda',
      modelReference: 'CX5',
      plate: 'ABC123',
      isActive: 'false',
    });

    expect(validateSync(inactiveBody)).toHaveLength(0);
    expect(inactiveBody.isActive).toBe(false);
    expect(validateSync(invalidBody)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ property: 'isActive' }),
      ]),
    );
  });
});
