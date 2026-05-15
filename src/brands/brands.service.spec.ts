import { ConflictException, NotFoundException } from '@nestjs/common';
import { BrandsService } from './brands.service';
import {
  BrandDuplicateNameError,
  BrandsRepository,
} from './persistence/brands.repository';

describe('BrandsService', () => {
  const brandRecord = {
    id: 'brand-bosch',
    name: 'Bosch',
    normalizedName: 'bosch',
    isActive: true,
    createdAt: new Date('2026-05-05T12:00:00.000Z'),
    updatedAt: new Date('2026-05-05T12:00:00.000Z'),
  };

  const repository = {
    create: jest.fn(),
    findMany: jest.fn(),
    findOptions: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
  } as unknown as jest.Mocked<BrandsRepository>;

  let service: BrandsService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new BrandsService(repository);
  });

  it('creates or reuses a normalized brand through the repository', async () => {
    repository.create.mockResolvedValue(brandRecord);

    await expect(service.create({ name: ' BoScH ' })).resolves.toBe(
      brandRecord,
    );

    expect(repository.create).toHaveBeenCalledWith({ name: ' BoScH ' });
  });

  it('returns brand options with labels', async () => {
    repository.findOptions.mockResolvedValue([brandRecord]);

    await expect(service.findOptions({ limit: 10 })).resolves.toEqual({
      data: [{ id: 'brand-bosch', label: 'Bosch', isActive: true }],
      meta: { limit: 10 },
    });
  });

  it('throws NotFoundException when updating a missing brand', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.update('missing-brand', { name: 'Bosch' })).rejects.toThrow(
      new NotFoundException('Brand missing-brand not found'),
    );
  });

  it('maps normalized duplicate brand renames to ConflictException', async () => {
    repository.findById.mockResolvedValue(brandRecord);
    repository.update.mockRejectedValue(new BrandDuplicateNameError());

    await expect(
      service.update('brand-other', { name: ' BOSCH ' }),
    ).rejects.toThrow(new ConflictException('Brand name already exists'));
  });
});
