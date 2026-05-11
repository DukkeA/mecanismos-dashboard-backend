import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  SupplierDocumentType,
  SupplierType,
} from '../../generated/prisma/enums';
import { SuppliersRepository } from './persistence/suppliers.repository';
import { SuppliersService } from './suppliers.service';

describe('SuppliersService', () => {
  const supplierRecord = {
    id: 'supplier-1',
    name: 'Repuestos Central',
    type: SupplierType.COMPANY,
    contactName: 'Laura Perez',
    documentType: SupplierDocumentType.NIT,
    documentNumber: '900123456',
    email: 'compras@repuestos.test',
    notes: '<p>Proveedor preferido</p>',
    isActive: true,
    createdAt: new Date('2026-05-05T12:00:00.000Z'),
    updatedAt: new Date('2026-05-05T12:00:00.000Z'),
    phones: [
      {
        id: 'phone-1',
        supplierId: 'supplier-1',
        label: 'Principal',
        phone: '3001234567',
        isPrimary: true,
        hasWhatsapp: true,
        notes: null,
        createdAt: new Date('2026-05-05T12:00:00.000Z'),
        updatedAt: new Date('2026-05-05T12:00:00.000Z'),
      },
      {
        id: 'phone-2',
        supplierId: 'supplier-1',
        label: 'Bodega',
        phone: '3109876543',
        isPrimary: false,
        hasWhatsapp: false,
        notes: 'Solo horario laboral',
        createdAt: new Date('2026-05-05T12:00:00.000Z'),
        updatedAt: new Date('2026-05-05T12:00:00.000Z'),
      },
    ],
  };

  const repository = {
    create: jest.fn(),
    findMany: jest.fn(),
    findOptions: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
  } as unknown as jest.Mocked<SuppliersRepository>;

  let service: SuppliersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SuppliersService(repository);
  });

  it('creates a supplier and makes the first phone primary when none is marked', async () => {
    repository.create.mockResolvedValue(supplierRecord);

    await expect(
      service.create({
        name: ' Repuestos Central ',
        type: SupplierType.COMPANY,
        contactName: ' Laura Perez ',
        documentType: SupplierDocumentType.NIT,
        documentNumber: ' 900123456 ',
        email: ' COMPRAS@REPUESTOS.TEST ',
        notes: ' <p>Proveedor preferido</p> ',
        isActive: true,
        phones: [
          {
            label: 'Principal',
            phone: '3001234567',
            isPrimary: false,
            hasWhatsapp: true,
          },
          {
            label: 'Bodega',
            phone: '3109876543',
            isPrimary: false,
            hasWhatsapp: false,
          },
        ],
      }),
    ).resolves.toEqual(supplierRecord);

    expect(repository.create.mock.calls[0]?.[0]).toMatchObject({
      phones: [
        expect.objectContaining({ phone: '3001234567', isPrimary: true }),
        expect.objectContaining({ phone: '3109876543', isPrimary: false }),
      ],
    });
  });

  it('rejects create when phones are missing', async () => {
    await expect(
      service.create({
        name: 'Repuestos Central',
        type: SupplierType.COMPANY,
        phones: [],
      }),
    ).rejects.toThrow(
      new BadRequestException('Suppliers require at least one phone'),
    );
  });

  it('rejects create when multiple primary phones are provided', async () => {
    await expect(
      service.create({
        name: 'Repuestos Central',
        type: SupplierType.COMPANY,
        phones: [
          { phone: '3001234567', isPrimary: true },
          { phone: '3109876543', isPrimary: true },
        ],
      }),
    ).rejects.toThrow(
      new BadRequestException('Suppliers require exactly one primary phone'),
    );
  });

  it('returns a paginated supplier list', async () => {
    repository.findMany.mockResolvedValue({
      items: [supplierRecord],
      total: 1,
      page: 2,
      limit: 5,
    });

    await expect(
      service.findAll({
        page: 2,
        limit: 5,
        search: 'repuestos',
        isActive: true,
        type: SupplierType.COMPANY,
      }),
    ).resolves.toEqual({
      data: [supplierRecord],
      meta: {
        page: 2,
        limit: 5,
        total: 1,
        totalPages: 1,
      },
    });
  });

  it('returns active supplier options', async () => {
    repository.findOptions.mockResolvedValue([
      {
        id: 'supplier-1',
        name: 'Repuestos Central',
        contactName: 'Laura Perez',
        email: 'compras@repuestos.test',
        isActive: true,
        type: SupplierType.COMPANY,
        phones: [{ phone: '3001234567', isPrimary: true }],
      },
    ] as never);

    await expect(service.findOptions({ limit: 10 })).resolves.toEqual({
      data: [
        {
          id: 'supplier-1',
          label: 'Repuestos Central',
          description: 'Laura Perez',
          isActive: true,
          context: {
            type: SupplierType.COMPANY,
            phone: '3001234567',
            email: 'compras@repuestos.test',
          },
        },
      ],
      meta: { limit: 10 },
    });
  });

  it('throws NotFoundException when the supplier does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.findOne('missing-supplier')).rejects.toThrow(
      new NotFoundException('Supplier missing-supplier not found'),
    );
  });

  it('updates an existing supplier without replacing phones when phones are omitted', async () => {
    repository.findById.mockResolvedValue(supplierRecord);
    repository.update.mockResolvedValue({
      ...supplierRecord,
      contactName: 'Andrea Diaz',
    });

    await expect(
      service.update('supplier-1', {
        contactName: ' Andrea Diaz ',
      }),
    ).resolves.toEqual({
      ...supplierRecord,
      contactName: 'Andrea Diaz',
    });

    expect(repository.update.mock.calls[0]).toEqual([
      'supplier-1',
      { contactName: ' Andrea Diaz ' },
    ]);
  });

  it('updates phones with a single normalized primary entry', async () => {
    repository.findById.mockResolvedValue(supplierRecord);
    repository.update.mockResolvedValue({
      ...supplierRecord,
      phones: [
        {
          ...supplierRecord.phones[0],
          phone: '3009998888',
          isPrimary: true,
        },
        {
          ...supplierRecord.phones[1],
          phone: '3107776666',
          isPrimary: false,
        },
      ],
    });

    await expect(
      service.update('supplier-1', {
        phones: [
          { phone: '3009998888', isPrimary: false, hasWhatsapp: true },
          { phone: '3107776666', isPrimary: false, hasWhatsapp: false },
        ],
      }),
    ).resolves.toMatchObject({ id: 'supplier-1' });

    expect(repository.update.mock.calls[0]?.[0]).toBe('supplier-1');
    expect(repository.update.mock.calls[0]?.[1]).toMatchObject({
      phones: [
        expect.objectContaining({ phone: '3009998888', isPrimary: true }),
        expect.objectContaining({ phone: '3107776666', isPrimary: false }),
      ],
    });
  });

  it('rejects updates that replace phones with an empty collection', async () => {
    repository.findById.mockResolvedValue(supplierRecord);

    await expect(service.update('supplier-1', { phones: [] })).rejects.toThrow(
      new BadRequestException('Suppliers require at least one phone'),
    );
  });

  it('quick-creates a supplier with option-compatible response data', async () => {
    repository.create.mockResolvedValue(supplierRecord);

    await expect(
      service.quickCreate({
        name: 'Repuestos Central',
        type: SupplierType.COMPANY,
        phones: [{ phone: '3001234567', isPrimary: true }],
      }),
    ).resolves.toMatchObject({
      data: { id: 'supplier-1', label: 'Repuestos Central' },
      entity: supplierRecord,
    });
  });
});
