import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { EmployeeType, PaymentMethod } from '../../../generated/prisma/enums';
import { CreateEmployeeBonusDto } from './create-employee-bonus.dto';
import { CreateEmployeeDto } from './create-employee.dto';
import { ListEmployeeBonusesQueryDto } from './list-employee-bonuses-query.dto';
import { ListEmployeesQueryDto } from './list-employees-query.dto';
import { UpdateEmployeeDto } from './update-employee.dto';

describe('employee DTO contracts', () => {
  it('trims create fields and rejects blank required values', async () => {
    const validDto = plainToInstance(CreateEmployeeDto, {
      name: '  Ana Torres  ',
      type: EmployeeType.MECHANIC,
      phone: '  3001234567  ',
      baseSalaryMonthly: 2500000,
      costCenterId: '  cost-center-1  ',
      isActive: false,
    });
    const invalidDto = plainToInstance(CreateEmployeeDto, {
      name: '   ',
      type: 'INVALID',
      baseSalaryMonthly: -1,
    });

    expect(validDto.name).toBe('Ana Torres');
    expect(validDto.phone).toBe('3001234567');
    expect(validDto.costCenterId).toBe('cost-center-1');
    await expect(validate(validDto)).resolves.toHaveLength(0);

    const errors = await validate(invalidDto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['name', 'type', 'baseSalaryMonthly']),
    );
  });

  it('uses list defaults, trims search, and parses boolean and enum filters', async () => {
    const defaultsDto = plainToInstance(ListEmployeesQueryDto, {});
    const filteredDto = plainToInstance(ListEmployeesQueryDto, {
      search: '  ana  ',
      type: EmployeeType.SALES,
      isActive: 'FALSE',
      costCenterId: '  cc-1  ',
      page: '2',
      limit: '5',
    });

    expect(defaultsDto.page).toBe(1);
    expect(defaultsDto.limit).toBe(10);
    expect(filteredDto.search).toBe('ana');
    expect(filteredDto.type).toBe(EmployeeType.SALES);
    expect(filteredDto.isActive).toBe(false);
    expect(filteredDto.costCenterId).toBe('cc-1');
    await expect(validate(defaultsDto)).resolves.toHaveLength(0);
    await expect(validate(filteredDto)).resolves.toHaveLength(0);
  });

  it('lets update stay partial while still validating optional bounds', async () => {
    const validDto = plainToInstance(UpdateEmployeeDto, {
      phone: '  3009990000  ',
      baseSalaryMonthly: 0,
      isActive: true,
    });
    const invalidDto = plainToInstance(UpdateEmployeeDto, {
      baseSalaryMonthly: -10,
    });

    expect(validDto.phone).toBe('3009990000');
    await expect(validate(validDto)).resolves.toHaveLength(0);

    const errors = await validate(invalidDto);

    expect(errors).toHaveLength(1);
    expect(errors[0]?.property).toBe('baseSalaryMonthly');
  });

  it('validates bonus payloads and bonus-list defaults', async () => {
    const createDto = plainToInstance(CreateEmployeeBonusDto, {
      amount: 150000,
      description: '  Bono trimestral  ',
      paidAt: '2026-05-09T10:00:00.000Z',
      paymentMethod: PaymentMethod.TRANSFER,
    });
    const listDto = plainToInstance(ListEmployeeBonusesQueryDto, {
      from: '2026-05-01T00:00:00.000Z',
      to: '2026-05-31T23:59:59.000Z',
      page: '3',
      limit: '20',
    });
    const invalidCreateDto = plainToInstance(CreateEmployeeBonusDto, {
      amount: 0,
      paidAt: 'not-a-date',
      paymentMethod: 'WIRE',
    });

    expect(createDto.description).toBe('Bono trimestral');
    expect(listDto.page).toBe(3);
    expect(listDto.limit).toBe(20);
    expect(listDto.from).toBeInstanceOf(Date);
    expect(listDto.to).toBeInstanceOf(Date);
    await expect(validate(createDto)).resolves.toHaveLength(0);
    await expect(validate(listDto)).resolves.toHaveLength(0);

    const errors = await validate(invalidCreateDto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['amount', 'paidAt', 'paymentMethod']),
    );
  });
});
