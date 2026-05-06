import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ListServicesQueryDto } from './list-services-query.dto';

describe('ListServicesQueryDto', () => {
  it('uses defaults when query parameters are omitted', async () => {
    const dto = plainToInstance(ListServicesQueryDto, {});

    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(10);
    expect(dto.search).toBeUndefined();
    expect(dto.isActive).toBeUndefined();
    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('trims search and parses true/false boolean strings', async () => {
    const enabledDto = plainToInstance(ListServicesQueryDto, {
      search: '  diag  ',
      isActive: ' true ',
    });
    const disabledDto = plainToInstance(ListServicesQueryDto, {
      isActive: 'FALSE',
    });

    expect(enabledDto.search).toBe('diag');
    expect(enabledDto.isActive).toBe(true);
    expect(disabledDto.isActive).toBe(false);
    await expect(validate(enabledDto)).resolves.toHaveLength(0);
    await expect(validate(disabledDto)).resolves.toHaveLength(0);
  });

  it('rejects invalid boolean values', async () => {
    const dto = plainToInstance(ListServicesQueryDto, {
      isActive: 'sometimes',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0]?.property).toBe('isActive');
    expect(errors[0]?.constraints).toMatchObject({
      isBoolean: 'isActive must be a boolean value',
    });
  });

  it('rejects invalid page and limit ranges', async () => {
    const dto = plainToInstance(ListServicesQueryDto, {
      page: '0',
      limit: '101',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(2);
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['page', 'limit']),
    );
  });
});
