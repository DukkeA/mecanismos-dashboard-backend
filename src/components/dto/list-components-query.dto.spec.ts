import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ComponentOptionsQueryDto } from './component-options-query.dto';
import { CreateComponentDto } from './create-component.dto';
import { ListComponentsQueryDto } from './list-components-query.dto';

describe('Component lifecycle DTOs', () => {
  it('transforms valid lifecycle query strings and rejects invalid values', () => {
    const inactiveList = plainToInstance(ListComponentsQueryDto, {
      isActive: 'false',
    });
    const activeOptions = plainToInstance(ComponentOptionsQueryDto, {
      isActive: 'true',
    });
    const invalidQuery = plainToInstance(ComponentOptionsQueryDto, {
      isActive: '0',
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

  it('accepts boolean lifecycle state in component bodies and rejects non-booleans', () => {
    const inactiveBody = plainToInstance(CreateComponentDto, {
      customerId: 'customer-1',
      componentTypeId: 'component-type-1',
      brand: 'Bosch',
      reference: 'ALT-90A',
      isActive: false,
    });
    const invalidBody = plainToInstance(CreateComponentDto, {
      customerId: 'customer-1',
      componentTypeId: 'component-type-1',
      brand: 'Bosch',
      reference: 'ALT-90A',
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
