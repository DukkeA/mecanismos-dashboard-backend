import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { WorkOrderType } from '../../../generated/prisma/enums';
import { CreateWorkOrderDto } from './create-work-order.dto';
import { UpdateWorkOrderDto } from './update-work-order.dto';

describe('work-order workshop detail DTO contracts', () => {
  it('trims workshop detail strings and parses boolean flags for create requests', async () => {
    const validDto = plainToInstance(CreateWorkOrderDto, {
      type: WorkOrderType.WORKSHOP,
      customerId: ' customer-1 ',
      summary: ' Diagnóstico ',
      customerReportedIssue: ' No enciende ',
      diagnosisRequired: 'true',
      diagnosisSummary: ' Revisar alternador ',
    });

    expect(validDto.customerReportedIssue).toBe('No enciende');
    expect(validDto.diagnosisRequired).toBe(true);
    expect(validDto.diagnosisSummary).toBe('Revisar alternador');
    await expect(validate(validDto)).resolves.toHaveLength(0);
  });

  it('keeps update partial while rejecting invalid workshop detail booleans', async () => {
    const validDto = plainToInstance(UpdateWorkOrderDto, {
      diagnosisRequired: 'false',
    });
    const invalidDto = plainToInstance(UpdateWorkOrderDto, {
      diagnosisRequired: 'sometimes',
    });

    expect(validDto.diagnosisRequired).toBe(false);
    await expect(validate(validDto)).resolves.toHaveLength(0);

    const errors = await validate(invalidDto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['diagnosisRequired']),
    );
  });
});
