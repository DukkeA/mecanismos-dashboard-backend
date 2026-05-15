import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateCustomerDto } from './create-customer.dto';
import { CustomerOptionsQueryDto } from './customer-options-query.dto';
import { ListCustomersQueryDto } from './list-customers-query.dto';

describe('ListCustomersQueryDto', () => {
  it('accepts allowlisted sorting and applies default sorting', () => {
    const defaultQuery = plainToInstance(ListCustomersQueryDto, {});
    const sortedQuery = plainToInstance(ListCustomersQueryDto, {
      sortBy: 'name',
      sortDir: 'asc',
    });

    expect(validateSync(defaultQuery)).toHaveLength(0);
    expect(defaultQuery.sortBy).toBe('createdAt');
    expect(defaultQuery.sortDir).toBe('desc');
    expect(validateSync(sortedQuery)).toHaveLength(0);
  });

  it('rejects unsupported sort fields and directions', () => {
    const query = plainToInstance(ListCustomersQueryDto, {
      sortBy: 'balance',
      sortDir: 'up',
    });

    const errors = validateSync(query);

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ property: 'sortBy' }),
        expect.objectContaining({ property: 'sortDir' }),
      ]),
    );
  });

  it('transforms valid lifecycle query strings and rejects invalid values', () => {
    const inactiveList = plainToInstance(ListCustomersQueryDto, {
      isActive: 'false',
    });
    const activeOptions = plainToInstance(CustomerOptionsQueryDto, {
      isActive: 'true',
    });
    const invalidQuery = plainToInstance(ListCustomersQueryDto, {
      isActive: 'yes',
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

  it('accepts boolean lifecycle state in customer bodies and rejects non-booleans', () => {
    const inactiveBody = plainToInstance(CreateCustomerDto, {
      name: 'Ana Gomez',
      phone: '3001234567',
      documentType: 'CEDULA',
      documentNumber: '123456789',
      isActive: false,
    });
    const invalidBody = plainToInstance(CreateCustomerDto, {
      name: 'Ana Gomez',
      phone: '3001234567',
      documentType: 'CEDULA',
      documentNumber: '123456789',
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
