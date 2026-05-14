import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  ExpenseCategory,
  PaymentMethod,
} from '../../../generated/prisma/enums';
import { LEXICAL_NOTE_EXAMPLE } from '../../common/rich-text/lexical-note';
import { CreateExpenseDto } from './create-expense.dto';
import { ListExpensesQueryDto } from './list-expenses-query.dto';
import { UpdateExpenseDto } from './update-expense.dto';

describe('expense DTO contracts', () => {
  it('trims create fields, parses dates, and rejects invalid enum or payment semantics', async () => {
    const validDto = plainToInstance(CreateExpenseDto, {
      name: '  Arriendo mayo  ',
      category: ExpenseCategory.RENT,
      amount: 1500000,
      expectedAt: '2026-05-15T00:00:00.000Z',
      paidAt: '2026-05-16T00:00:00.000Z',
      paymentMethod: PaymentMethod.TRANSFER,
      costCenterId: '  cc-1  ',
      notes: LEXICAL_NOTE_EXAMPLE,
    });
    const invalidDto = plainToInstance(CreateExpenseDto, {
      name: '   ',
      category: 'INVALID',
      amount: -1,
      expectedAt: 'not-a-date',
      paymentMethod: PaymentMethod.CASH,
    });

    expect(validDto.name).toBe('Arriendo mayo');
    expect(validDto.costCenterId).toBe('cc-1');
    expect(validDto.notes).toEqual(LEXICAL_NOTE_EXAMPLE);
    expect(validDto.expectedAt).toBeInstanceOf(Date);
    expect(validDto.paidAt).toBeInstanceOf(Date);
    await expect(validate(validDto)).resolves.toHaveLength(0);

    const errors = await validate(invalidDto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining([
        'name',
        'category',
        'amount',
        'expectedAt',
        'paymentMethod',
      ]),
    );
  });

  it('uses list defaults, trims search, and parses enum, boolean, and date window filters', async () => {
    const defaultsDto = plainToInstance(ListExpensesQueryDto, {});
    const filteredDto = plainToInstance(ListExpensesQueryDto, {
      search: '  alquiler  ',
      category: ExpenseCategory.UTILITY,
      costCenterId: '  cc-2  ',
      isPaid: 'FALSE',
      expectedFrom: '2026-05-01T00:00:00.000Z',
      expectedTo: '2026-05-31T23:59:59.000Z',
      paidFrom: '2026-05-10T00:00:00.000Z',
      paidTo: '2026-05-20T23:59:59.000Z',
      page: '2',
      limit: '5',
    });

    expect(defaultsDto.page).toBe(1);
    expect(defaultsDto.limit).toBe(10);
    expect(filteredDto.search).toBe('alquiler');
    expect(filteredDto.category).toBe(ExpenseCategory.UTILITY);
    expect(filteredDto.costCenterId).toBe('cc-2');
    expect(filteredDto.isPaid).toBe(false);
    expect(filteredDto.expectedFrom).toBeInstanceOf(Date);
    expect(filteredDto.expectedTo).toBeInstanceOf(Date);
    expect(filteredDto.paidFrom).toBeInstanceOf(Date);
    expect(filteredDto.paidTo).toBeInstanceOf(Date);
    await expect(validate(defaultsDto)).resolves.toHaveLength(0);
    await expect(validate(filteredDto)).resolves.toHaveLength(0);
  });

  it('keeps update partial while still validating date parsing and paymentMethod without paidAt', async () => {
    const validDto = plainToInstance(UpdateExpenseDto, {
      name: '  Almuerzo técnico  ',
      paidAt: '2026-05-12T12:00:00.000Z',
      paymentMethod: PaymentMethod.CARD,
    });
    const invalidDto = plainToInstance(UpdateExpenseDto, {
      paidAt: 'not-a-date',
      paymentMethod: PaymentMethod.OTHER,
    });

    expect(validDto.name).toBe('Almuerzo técnico');
    expect(validDto.paidAt).toBeInstanceOf(Date);
    await expect(validate(validDto)).resolves.toHaveLength(0);

    const errors = await validate(invalidDto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['paidAt']),
    );

    const unpaidErrors = await validate(
      plainToInstance(UpdateExpenseDto, {
        paymentMethod: PaymentMethod.OTHER,
      }),
    );

    expect(unpaidErrors).toHaveLength(1);
    expect(unpaidErrors[0]?.property).toBe('paymentMethod');
  });
});
