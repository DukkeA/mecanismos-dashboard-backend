import { ConflictException, NotFoundException } from '@nestjs/common';
import { CustomerDocumentType } from '../../generated/prisma/enums';
import {
  CustomerDuplicateDocumentError,
  CustomersRepository,
} from './persistence/customers.repository';
import { CustomersService } from './customers.service';

describe('CustomersService', () => {
  const customerRecord = {
    id: 'customer-1',
    name: 'Ana Gomez',
    phone: '3001234567',
    documentType: CustomerDocumentType.CEDULA,
    documentNumber: '123456789',
    email: 'ana@mecanismos.test',
    notes: '<p>Cliente frecuente</p>',
    createdAt: new Date('2026-05-05T10:00:00.000Z'),
    updatedAt: new Date('2026-05-05T10:00:00.000Z'),
  };

  const repository = {
    create: jest.fn(),
    findMany: jest.fn(),
    findOptions: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
  } as unknown as jest.Mocked<CustomersRepository>;

  let service: CustomersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CustomersService(repository);
  });

  it('creates a customer through the repository', async () => {
    repository.create.mockResolvedValue(customerRecord);

    await expect(
      service.create({
        name: ' Ana Gomez ',
        phone: ' 3001234567 ',
        documentType: CustomerDocumentType.CEDULA,
        documentNumber: ' 123456789 ',
        email: ' ANA@MECANISMOS.TEST ',
        notes: ' <p>Cliente frecuente</p> ',
      }),
    ).resolves.toEqual(customerRecord);
  });

  it('maps duplicate customer documents to ConflictException', async () => {
    repository.create.mockRejectedValue(new CustomerDuplicateDocumentError());

    await expect(
      service.create({
        name: 'Ana Gomez',
        phone: '3001234567',
        documentType: CustomerDocumentType.CEDULA,
        documentNumber: '123456789',
      }),
    ).rejects.toThrow(
      new ConflictException('Customer document already exists'),
    );
  });

  it('returns a paginated customer list', async () => {
    repository.findMany.mockResolvedValue({
      items: [customerRecord],
      total: 1,
      page: 2,
      limit: 5,
    });

    await expect(
      service.findAll({ page: 2, limit: 5, search: 'ana' }),
    ).resolves.toEqual({
      data: [customerRecord],
      meta: {
        page: 2,
        limit: 5,
        total: 1,
        totalPages: 1,
      },
    });
  });

  it('returns lightweight customer options', async () => {
    repository.findOptions.mockResolvedValue([
      {
        id: 'customer-1',
        name: 'Ana Gomez',
        phone: '3001234567',
        documentType: CustomerDocumentType.CEDULA,
        documentNumber: '123456789',
        email: 'ana@mecanismos.test',
      },
    ] as never);

    await expect(
      service.findOptions({ limit: 10, search: 'ana' }),
    ).resolves.toEqual({
      data: [
        {
          id: 'customer-1',
          label: 'Ana Gomez',
          description: 'CEDULA 123456789',
          context: {
            phone: '3001234567',
            email: 'ana@mecanismos.test',
          },
        },
      ],
      meta: { limit: 10 },
    });
  });

  it('throws NotFoundException when the customer does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.findOne('missing-customer')).rejects.toThrow(
      new NotFoundException('Customer missing-customer not found'),
    );
  });

  it('updates an existing customer', async () => {
    repository.findById.mockResolvedValue(customerRecord);
    repository.update.mockResolvedValue({
      ...customerRecord,
      name: 'Ana Gomez Restrepo',
    });

    await expect(
      service.update('customer-1', {
        name: ' Ana Gomez Restrepo ',
        email: ' ANA+VIP@MECANISMOS.TEST ',
      }),
    ).resolves.toEqual({
      ...customerRecord,
      name: 'Ana Gomez Restrepo',
    });
  });

  it('maps duplicate customer documents during update to ConflictException', async () => {
    repository.findById.mockResolvedValue(customerRecord);
    repository.update.mockRejectedValue(new CustomerDuplicateDocumentError());

    await expect(
      service.update('customer-1', {
        documentType: CustomerDocumentType.NIT,
        documentNumber: '900999888',
      }),
    ).rejects.toThrow(
      new ConflictException('Customer document already exists'),
    );
  });

  it('quick-creates a customer with option-compatible response data', async () => {
    repository.create.mockResolvedValue(customerRecord);

    await expect(
      service.quickCreate({
        name: 'Ana Gomez',
        phone: '3001234567',
        documentType: CustomerDocumentType.CEDULA,
        documentNumber: '123456789',
      }),
    ).resolves.toMatchObject({
      data: {
        id: 'customer-1',
        label: 'Ana Gomez',
      },
      entity: customerRecord,
    });
  });
});
