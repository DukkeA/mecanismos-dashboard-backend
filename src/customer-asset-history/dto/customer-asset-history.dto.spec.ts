import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  PaymentStatus,
  WorkOrderStatus,
  WorkOrderType,
} from '../../../generated/prisma/enums';
import {
  CustomerAssetHistoryDateField,
  CustomerAssetHistoryQueryDto,
} from './customer-asset-history-query.dto';

describe('customer asset history DTO contracts', () => {
  it('applies pagination defaults and parses valid scoped filters', async () => {
    const dto = plainToInstance(CustomerAssetHistoryQueryDto, {
      page: '2',
      limit: '25',
      dateFrom: '2026-05-01T00:00:00.000Z',
      dateTo: '2026-05-31T23:59:59.000Z',
      dateField: CustomerAssetHistoryDateField.ESTIMATED_COLLECTION_AT,
      status: WorkOrderStatus.COMPLETED,
      paymentStatus: PaymentStatus.PAID,
      type: WorkOrderType.WORKSHOP,
    });
    const defaults = plainToInstance(CustomerAssetHistoryQueryDto, {});

    expect(defaults.page).toBe(1);
    expect(defaults.limit).toBe(10);
    expect(defaults.dateField).toBe(CustomerAssetHistoryDateField.CREATED_AT);

    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(25);
    expect(dto.dateFrom).toBeInstanceOf(Date);
    expect(dto.dateTo).toBeInstanceOf(Date);
    expect(dto.dateField).toBe(
      CustomerAssetHistoryDateField.ESTIMATED_COLLECTION_AT,
    );
    expect(dto.status).toBe(WorkOrderStatus.COMPLETED);
    expect(dto.paymentStatus).toBe(PaymentStatus.PAID);
    expect(dto.type).toBe(WorkOrderType.WORKSHOP);
    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects invalid filters before broad history queries can run', async () => {
    const dto = plainToInstance(CustomerAssetHistoryQueryDto, {
      page: '0',
      limit: '101',
      dateFrom: '2026-05-31T00:00:00.000Z',
      dateTo: '2026-05-01T00:00:00.000Z',
      dateField: 'paidAt',
      status: 'BROKEN',
      paymentStatus: 'VOID',
      type: 'MUTATION',
    });

    const errors = await validate(dto);
    const properties = errors.map((error) => error.property);

    expect(properties).toEqual(
      expect.arrayContaining([
        'page',
        'limit',
        'dateTo',
        'dateField',
        'status',
        'paymentStatus',
        'type',
      ]),
    );
    expect(
      errors.find((error) => error.property === 'dateTo')?.constraints,
    ).toMatchObject({
      isDateRangeOrderValid: 'dateTo must be greater than or equal to dateFrom',
    });
  });
});
