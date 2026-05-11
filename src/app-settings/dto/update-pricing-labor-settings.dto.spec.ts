import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdatePricingLaborSettingsDto } from './update-pricing-labor-settings.dto';

describe('UpdatePricingLaborSettingsDto', () => {
  it('accepts valid uppercase settings payloads and transforms numerics', async () => {
    const dto = plainToInstance(UpdatePricingLaborSettingsDto, {
      currencyCode: 'COP',
      monthlyWorkingHours: '176',
      defaultLaborHourlyRate: '50000',
      saleContingencyPct: '5',
      workshopContingencyPct: '10',
      diagnosticContingencyPct: '20',
      minimumMarkupPct: '20',
      recommendedMarkupPct: '35',
      highMarkupPct: '50',
    });

    expect(dto).toMatchObject({
      currencyCode: 'COP',
      monthlyWorkingHours: 176,
      defaultLaborHourlyRate: 50000,
      saleContingencyPct: 5,
      workshopContingencyPct: 10,
      diagnosticContingencyPct: 20,
      minimumMarkupPct: 20,
      recommendedMarkupPct: 35,
      highMarkupPct: 50,
    });
    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects invalid currency, hours, contingency, and markup ranges', async () => {
    const dto = plainToInstance(UpdatePricingLaborSettingsDto, {
      currencyCode: 'CO',
      monthlyWorkingHours: 0,
      defaultLaborHourlyRate: -1,
      saleContingencyPct: 101,
      recommendedMarkupPct: 1001,
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining([
        'currencyCode',
        'monthlyWorkingHours',
        'defaultLaborHourlyRate',
        'saleContingencyPct',
        'recommendedMarkupPct',
      ]),
    );
  });
});
