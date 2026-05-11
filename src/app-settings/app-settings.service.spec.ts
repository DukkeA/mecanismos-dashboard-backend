import { BadRequestException } from '@nestjs/common';
import { AppSettingsService } from './app-settings.service';
import { AppSettingsRepository } from './app-settings.repository';
import { UpdatePricingLaborSettingsDto } from './dto/update-pricing-labor-settings.dto';

describe('AppSettingsService', () => {
  const getOrCreateCurrentMock = jest.fn();
  const updateCurrentWithAuditMock = jest.fn();
  const findPricingLaborHistoryMock = jest.fn();
  const countPricingLaborHistoryMock = jest.fn();
  const repository = {
    getOrCreateCurrent: getOrCreateCurrentMock,
    updateCurrentWithAudit: updateCurrentWithAuditMock,
    findPricingLaborHistory: findPricingLaborHistoryMock,
    countPricingLaborHistory: countPricingLaborHistoryMock,
  } as unknown as jest.Mocked<AppSettingsRepository>;

  let service: AppSettingsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AppSettingsService(repository);
  });

  it('returns the singleton pricing/labor settings, creating defaults when missing', async () => {
    getOrCreateCurrentMock.mockResolvedValue({
      currencyCode: 'COP',
      monthlyWorkingHours: 176,
      defaultLaborHourlyRate: 50000,
      saleContingencyPct: 5,
      workshopContingencyPct: 10,
      diagnosticContingencyPct: 20,
      minimumMarkupPct: 20,
      recommendedMarkupPct: 35,
      highMarkupPct: 50,
      updatedAt: new Date('2026-05-11T10:00:00.000Z'),
    });

    await expect(
      service.getCurrentPricingLaborSettings(),
    ).resolves.toMatchObject({
      currencyCode: 'COP',
      defaultLaborHourlyRate: 50000,
    });

    expect(getOrCreateCurrentMock).toHaveBeenCalledTimes(1);
  });

  it('updates changed singleton pricing/labor settings through the audit repository contract', async () => {
    const dto: UpdatePricingLaborSettingsDto = {
      currencyCode: 'USD',
      defaultLaborHourlyRate: 75000,
    };

    getOrCreateCurrentMock.mockResolvedValue({
      companyName: 'Mecanismos Tecnicos',
      currencyCode: 'COP',
      monthlyWorkingHours: 176,
      defaultLaborHourlyRate: 50000,
      saleContingencyPct: 5,
      workshopContingencyPct: 10,
      diagnosticContingencyPct: 20,
      minimumMarkupPct: 20,
      recommendedMarkupPct: 35,
      highMarkupPct: 50,
      updatedAt: new Date('2026-05-11T10:00:00.000Z'),
    });
    updateCurrentWithAuditMock.mockResolvedValue({
      companyName: 'Mecanismos Tecnicos',
      currencyCode: 'USD',
      monthlyWorkingHours: 176,
      defaultLaborHourlyRate: 75000,
      saleContingencyPct: 5,
      workshopContingencyPct: 10,
      diagnosticContingencyPct: 20,
      minimumMarkupPct: 20,
      recommendedMarkupPct: 35,
      highMarkupPct: 50,
      updatedAt: new Date('2026-05-11T11:00:00.000Z'),
    });

    await expect(
      service.updateCurrentPricingLaborSettings(dto, 'seed-user-admin'),
    ).resolves.toMatchObject({
      currencyCode: 'USD',
      defaultLaborHourlyRate: 75000,
    });

    expect(updateCurrentWithAuditMock).toHaveBeenCalledWith({
      actorUserId: 'seed-user-admin',
      dto,
      changedFields: ['currencyCode', 'defaultLaborHourlyRate'],
      beforeValues: {
        currencyCode: 'COP',
        defaultLaborHourlyRate: 50000,
      },
      afterValues: {
        currencyCode: 'USD',
        defaultLaborHourlyRate: 75000,
      },
    });
  });

  it('rejects an empty update payload before touching persistence', async () => {
    await expect(
      service.updateCurrentPricingLaborSettings({}, 'seed-user-admin'),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(getOrCreateCurrentMock).not.toHaveBeenCalled();
    expect(updateCurrentWithAuditMock).not.toHaveBeenCalled();
  });

  it('rejects updates that do not change audited values', async () => {
    getOrCreateCurrentMock.mockResolvedValue({
      companyName: 'Mecanismos Tecnicos',
      currencyCode: 'COP',
      monthlyWorkingHours: 176,
      defaultLaborHourlyRate: 50000,
      saleContingencyPct: 5,
      workshopContingencyPct: 10,
      diagnosticContingencyPct: 20,
      minimumMarkupPct: 20,
      recommendedMarkupPct: 35,
      highMarkupPct: 50,
      updatedAt: new Date('2026-05-11T10:00:00.000Z'),
    });

    await expect(
      service.updateCurrentPricingLaborSettings(
        { currencyCode: 'COP', defaultLaborHourlyRate: 50000 },
        'seed-user-admin',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(getOrCreateCurrentMock).toHaveBeenCalledTimes(1);
    expect(updateCurrentWithAuditMock).not.toHaveBeenCalled();
  });

  it('passes actor id and computed diffs to the audit update contract', async () => {
    getOrCreateCurrentMock.mockResolvedValue({
      companyName: 'Mecanismos Tecnicos',
      currencyCode: 'COP',
      monthlyWorkingHours: 176,
      defaultLaborHourlyRate: 50000,
      saleContingencyPct: 5,
      workshopContingencyPct: 10,
      diagnosticContingencyPct: 20,
      minimumMarkupPct: 20,
      recommendedMarkupPct: 35,
      highMarkupPct: 50,
      updatedAt: new Date('2026-05-11T10:00:00.000Z'),
    });
    updateCurrentWithAuditMock.mockResolvedValue({
      companyName: 'Mecanismos Tecnicos',
      currencyCode: 'USD',
      monthlyWorkingHours: 176,
      defaultLaborHourlyRate: 65000,
      saleContingencyPct: 5,
      workshopContingencyPct: 10,
      diagnosticContingencyPct: 20,
      minimumMarkupPct: 20,
      recommendedMarkupPct: 35,
      highMarkupPct: 50,
      updatedAt: new Date('2026-05-11T11:00:00.000Z'),
    });

    await expect(
      service.updateCurrentPricingLaborSettings(
        {
          currencyCode: 'USD',
          defaultLaborHourlyRate: 65000,
        },
        'seed-user-admin',
      ),
    ).resolves.toMatchObject({
      currencyCode: 'USD',
      defaultLaborHourlyRate: 65000,
    });

    expect(updateCurrentWithAuditMock).toHaveBeenCalledWith({
      actorUserId: 'seed-user-admin',
      dto: {
        currencyCode: 'USD',
        defaultLaborHourlyRate: 65000,
      },
      changedFields: ['currencyCode', 'defaultLaborHourlyRate'],
      beforeValues: {
        currencyCode: 'COP',
        defaultLaborHourlyRate: 50000,
      },
      afterValues: {
        currencyCode: 'USD',
        defaultLaborHourlyRate: 65000,
      },
    });
  });

  it('returns paginated audit history metadata and entries', async () => {
    findPricingLaborHistoryMock.mockResolvedValue([
      {
        id: 'audit-1',
        actorUserId: 'seed-user-admin',
        changedFields: ['currencyCode'],
        beforeValues: { currencyCode: 'COP' },
        afterValues: { currencyCode: 'USD' },
        createdAt: new Date('2026-05-11T11:00:00.000Z'),
      },
    ]);
    countPricingLaborHistoryMock.mockResolvedValue(3);

    await expect(
      service.getPricingLaborSettingsHistory({ page: 2, limit: 1 }),
    ).resolves.toEqual({
      data: [
        expect.objectContaining({
          id: 'audit-1',
          actorUserId: 'seed-user-admin',
          changedFields: ['currencyCode'],
        }),
      ],
      meta: {
        page: 2,
        limit: 1,
        total: 3,
      },
    });

    expect(findPricingLaborHistoryMock).toHaveBeenCalledWith({
      page: 2,
      limit: 1,
    });
    expect(countPricingLaborHistoryMock).toHaveBeenCalledTimes(1);
  });
});
