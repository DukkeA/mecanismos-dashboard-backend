import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ListSupplierQuotesQueryDto } from './list-supplier-quotes-query.dto';

describe('ListSupplierQuotesQueryDto', () => {
  it('parses includeVoided boolean query values for Postman supplier timelines', () => {
    const dto = plainToInstance(ListSupplierQuotesQueryDto, {
      includeVoided: 'true',
    });

    expect(validateSync(dto)).toEqual([]);
    expect(dto.includeVoided).toBe(true);
  });

  it('rejects invalid includeVoided query values', () => {
    const dto = plainToInstance(ListSupplierQuotesQueryDto, {
      includeVoided: 'sometimes',
    });

    const errors = validateSync(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0]?.property).toBe('includeVoided');
  });
});
