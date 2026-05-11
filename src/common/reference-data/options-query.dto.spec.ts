import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  ActiveOptionsQueryDto,
  OptionsQueryDto,
} from './options-query.dto';
import {
  buildOptionsResponse,
  buildQuickCreateResponse,
} from './reference-data.responses';

describe('reference-data DTO contracts', () => {
  it('trims search and uses limit=10 by default', async () => {
    const dto = plainToInstance(OptionsQueryDto, {
      search: '  bosch  ',
    });

    expect(dto.search).toBe('bosch');
    expect(dto.limit).toBe(10);
    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects limits above 100', async () => {
    const dto = plainToInstance(OptionsQueryDto, {
      limit: '101',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0]?.property).toBe('limit');
  });

  it('parses optional boolean filters for active-only option endpoints', async () => {
    const dto = plainToInstance(ActiveOptionsQueryDto, {
      isActive: ' false ',
    });

    expect(dto.isActive).toBe(false);
    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('builds standard options and quick-create response shapes', () => {
    expect(
      buildOptionsResponse(
        [{ id: 'service-1', label: 'Diagnóstico' }],
        10,
      ),
    ).toEqual({
      data: [{ id: 'service-1', label: 'Diagnóstico' }],
      meta: { limit: 10 },
    });

    expect(
      buildQuickCreateResponse(
        { id: 'service-2', label: 'Calibración' },
        { id: 'service-2', name: 'Calibración' },
      ),
    ).toEqual({
      data: { id: 'service-2', label: 'Calibración' },
      entity: { id: 'service-2', name: 'Calibración' },
    });
  });
});
