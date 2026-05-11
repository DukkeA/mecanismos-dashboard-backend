import { AppSettingsService } from './app-settings.service';
import { AppSettingsRepository } from './app-settings.repository';
import { UpdatePricingLaborSettingsDto } from './dto/update-pricing-labor-settings.dto';

describe('AppSettingsService', () => {
  const getOrCreateCurrentMock = jest.fn();
  const updateCurrentMock = jest.fn();
  const repository = {
    getOrCreateCurrent: getOrCreateCurrentMock,
    updateCurrent: updateCurrentMock,
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

  it('updates the singleton pricing/labor settings through the repository contract', async () => {
    const dto: UpdatePricingLaborSettingsDto = {
      currencyCode: 'USD',
      defaultLaborHourlyRate: 75000,
    };

    updateCurrentMock.mockResolvedValue({
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
      service.updateCurrentPricingLaborSettings(dto),
    ).resolves.toMatchObject({
      currencyCode: 'USD',
      defaultLaborHourlyRate: 75000,
    });

    expect(updateCurrentMock).toHaveBeenCalledWith(dto);
  });
});
