import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateCostCenterDto } from './create-cost-center.dto';
import { ListCostCentersQueryDto } from './list-cost-centers-query.dto';
import { UpdateCostCenterDto } from './update-cost-center.dto';

describe('cost center DTO contracts', () => {
  it('trims create fields and rejects blank required values', async () => {
    const validDto = plainToInstance(CreateCostCenterDto, {
      code: '  general  ',
      name: '  General  ',
      isActive: false,
    });
    const invalidDto = plainToInstance(CreateCostCenterDto, {
      code: '   ',
      name: '   ',
    });

    expect(validDto.code).toBe('general');
    expect(validDto.name).toBe('General');
    await expect(validate(validDto)).resolves.toHaveLength(0);

    const errors = await validate(invalidDto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['code', 'name']),
    );
  });

  it('uses list defaults, trims search, and parses boolean filters', async () => {
    const defaultsDto = plainToInstance(ListCostCentersQueryDto, {});
    const filteredDto = plainToInstance(ListCostCentersQueryDto, {
      search: '  bod  ',
      isActive: 'FALSE',
      page: '2',
      limit: '5',
    });

    expect(defaultsDto.page).toBe(1);
    expect(defaultsDto.limit).toBe(10);
    expect(filteredDto.search).toBe('bod');
    expect(filteredDto.isActive).toBe(false);
    await expect(validate(defaultsDto)).resolves.toHaveLength(0);
    await expect(validate(filteredDto)).resolves.toHaveLength(0);
  });

  it('lets update stay partial while still trimming optional strings', async () => {
    const dto = plainToInstance(UpdateCostCenterDto, {
      code: '  oficina  ',
      isActive: true,
    });

    expect(dto.code).toBe('oficina');
    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects invalid boolean query filters', async () => {
    const dto = plainToInstance(ListCostCentersQueryDto, {
      isActive: 'sometimes',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0]?.property).toBe('isActive');
  });
});
