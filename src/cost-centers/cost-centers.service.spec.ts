import { ConflictException, NotFoundException } from '@nestjs/common';
import { CostCentersService } from './cost-centers.service';
import {
  CostCenterCodeConflictError,
  CostCentersRepository,
} from './persistence/cost-centers.repository';

describe('CostCentersService', () => {
  const costCenterRecord = {
    id: 'cost-center-1',
    code: 'GENERAL',
    name: 'General',
    isActive: true,
    createdAt: new Date('2026-05-09T12:00:00.000Z'),
    updatedAt: new Date('2026-05-09T12:00:00.000Z'),
  };

  const repository = {
    create: jest.fn(),
    findMany: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
  } as unknown as jest.Mocked<CostCentersRepository>;

  let service: CostCentersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CostCentersService(repository);
  });

  it('creates cost centers with canonical uppercase code and default active state', async () => {
    repository.create.mockResolvedValue(costCenterRecord);

    await expect(
      service.create({
        code: '  general  ',
        name: '  General  ',
      }),
    ).resolves.toEqual(costCenterRecord);

    expect(repository.create.mock.calls[0]).toEqual([
      {
        code: 'GENERAL',
        name: 'General',
        isActive: undefined,
      },
    ]);
  });

  it('returns paginated cost centers with pragmatic filters', async () => {
    repository.findMany.mockResolvedValue({
      items: [costCenterRecord],
      total: 1,
      page: 1,
      limit: 10,
    });

    await expect(
      service.findAll({
        page: 1,
        limit: 10,
        search: 'gene',
        isActive: true,
      }),
    ).resolves.toEqual({
      data: [costCenterRecord],
      meta: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      },
    });
  });

  it('rejects duplicate canonical codes with a 409 conflict', async () => {
    repository.create.mockRejectedValue(new CostCenterCodeConflictError());

    await expect(
      service.create({
        code: 'general',
        name: 'General duplicado',
      }),
    ).rejects.toThrow(new ConflictException('Cost center code already exists'));
  });

  it('throws NotFoundException when the cost center does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.findOne('missing-cost-center')).rejects.toThrow(
      new NotFoundException('Cost center missing-cost-center not found'),
    );
  });

  it('updates canonical code and deactivates existing cost centers', async () => {
    repository.findById.mockResolvedValue(costCenterRecord);
    repository.update.mockResolvedValue({
      ...costCenterRecord,
      code: 'BODEGA',
      name: 'Bodega',
      isActive: false,
    });

    await expect(
      service.update('cost-center-1', {
        code: '  bodega  ',
        name: '  Bodega  ',
        isActive: false,
      }),
    ).resolves.toMatchObject({
      id: 'cost-center-1',
      code: 'BODEGA',
      isActive: false,
    });

    expect(repository.update.mock.calls[0]).toEqual([
      'cost-center-1',
      {
        code: 'BODEGA',
        name: 'Bodega',
        isActive: false,
      },
    ]);
  });
});
