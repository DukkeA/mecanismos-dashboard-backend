jest.mock('../../src/prisma.service', () => ({
  PrismaService: class PrismaServiceMock {
    async $connect() {}
    async $disconnect() {}
  },
}));

import {
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { SupplierType } from '../../generated/prisma/enums';
import { AppModule } from '../../src/app.module';
import { SuppliersService } from '../../src/suppliers/suppliers.service';

type SupplierPhonePayload = {
  label?: string;
  phone: string;
  isPrimary: boolean;
  hasWhatsapp?: boolean;
  notes?: string;
};

type SupplierPayload = {
  name: string;
  type: 'PERSON' | 'COMPANY';
  contactName?: string;
  documentType?: 'CEDULA' | 'NIT' | 'OTHER';
  documentNumber?: string;
  email?: string;
  notes?: string;
  isActive?: boolean;
  phones: SupplierPhonePayload[];
};

type SupplierRecord = SupplierPayload & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

function buildSuppliersServiceOverride() {
  const suppliers = new Map<string, SupplierRecord>();
  let sequence = 0;

  return {
    create(payload: SupplierPayload) {
      const record = buildSupplierRecord(payload, `supplier-${++sequence}`);
      suppliers.set(record.id, record);

      return record;
    },

    findAll(query: {
      page?: number;
      limit?: number;
      search?: string;
      isActive?: boolean;
      type?: 'PERSON' | 'COMPANY';
    }) {
      const page = query.page ?? 1;
      const limit = query.limit ?? 10;
      const search = query.search?.toLowerCase();

      const filtered = [...suppliers.values()].filter((supplier) => {
        if (
          query.isActive !== undefined &&
          supplier.isActive !== query.isActive
        ) {
          return false;
        }

        if (query.type && supplier.type !== query.type) {
          return false;
        }

        if (!search) {
          return true;
        }

        return [
          supplier.name,
          supplier.email,
          supplier.contactName,
          supplier.documentNumber,
          ...supplier.phones.map((phone) => phone.phone),
        ].some((value) => value?.toLowerCase().includes(search));
      });

      return {
        data: filtered.slice((page - 1) * limit, page * limit),
        meta: {
          page,
          limit,
          total: filtered.length,
          totalPages: Math.ceil(filtered.length / limit) || 1,
        },
      };
    },

    findOne(id: string) {
      const supplier = suppliers.get(id);

      if (!supplier) {
        throw new NotFoundException(`Supplier ${id} not found`);
      }

      return supplier;
    },

    update(id: string, payload: Partial<SupplierPayload>) {
      const current = suppliers.get(id);

      if (!current) {
        throw new NotFoundException(`Supplier ${id} not found`);
      }

      const nextPayload: SupplierPayload = {
        ...current,
        ...payload,
        phones: payload.phones ?? current.phones,
      };
      const record = buildSupplierRecord(nextPayload, id, current.createdAt);
      suppliers.set(id, record);

      return record;
    },
  };
}

function buildSupplierRecord(
  payload: SupplierPayload,
  id: string,
  createdAt: string = new Date('2026-05-05T10:00:00.000Z').toISOString(),
): SupplierRecord {
  return {
    id,
    name: payload.name.trim(),
    type: payload.type,
    contactName: normalizeOptionalString(payload.contactName),
    documentType: payload.documentType,
    documentNumber: normalizeOptionalString(payload.documentNumber),
    email: normalizeOptionalString(payload.email)?.toLowerCase(),
    notes: normalizeOptionalString(payload.notes),
    isActive: payload.isActive ?? true,
    phones: normalizePhones(payload.phones),
    createdAt,
    updatedAt: new Date('2026-05-05T11:00:00.000Z').toISOString(),
  };
}

function normalizePhones(phones: SupplierPhonePayload[]) {
  const primaryIndex = phones.findIndex((phone) => phone.isPrimary);

  return phones.map((phone, index) => ({
    label: normalizeOptionalString(phone.label),
    phone: phone.phone.trim(),
    isPrimary: primaryIndex === -1 ? index === 0 : index === primaryIndex,
    hasWhatsapp: phone.hasWhatsapp ?? false,
    notes: normalizeOptionalString(phone.notes),
  }));
}

function normalizeOptionalString(value?: string | null) {
  const normalized = value?.trim();

  return normalized ? normalized : undefined;
}

describe('SuppliersController (e2e)', () => {
  let app: INestApplication<App>;

  function readBody<T>(response: request.Response): T {
    return response.body as T;
  }

  async function createAccessToken(role: 'ADMIN' | 'SALES' | 'MECHANIC') {
    const jwtService = new JwtService();

    return jwtService.signAsync(
      { sub: 'user-1', role },
      {
        secret: process.env.AUTH_ACCESS_TOKEN_SECRET,
        expiresIn: 900,
      },
    );
  }

  beforeEach(async () => {
    process.env.AUTH_ACCESS_TOKEN_SECRET = 'access-secret';
    process.env.AUTH_REFRESH_TOKEN_SECRET = 'refresh-secret';
    process.env.AUTH_ALLOWED_ORIGINS = 'http://localhost:5173';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SuppliersService)
      .useValue(buildSuppliersServiceOverride())
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('rejects unauthenticated supplier listing', async () => {
    await request(app.getHttpServer()).get('/suppliers').expect(401);
  });

  it('rejects authenticated MECHANIC supplier listing', async () => {
    const accessToken = await createAccessToken('MECHANIC');

    await request(app.getHttpServer())
      .get('/suppliers')
      .set('Cookie', [`md_access=${accessToken}`])
      .expect(403);
  });

  it.each(['ADMIN', 'SALES'] as const)(
    'allows authenticated %s users to list suppliers with pragmatic filters',
    async (role) => {
      const accessToken = await createAccessToken(role);

      await request(app.getHttpServer())
        .post('/suppliers')
        .set('Cookie', [`md_access=${accessToken}`])
        .send({
          name: 'Repuestos Central',
          type: SupplierType.COMPANY,
          email: 'compras@repuestos.test',
          isActive: true,
          phones: [{ phone: '3001234567', isPrimary: true, hasWhatsapp: true }],
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/suppliers')
        .set('Cookie', [`md_access=${accessToken}`])
        .send({
          name: 'Taller de Barrio',
          type: SupplierType.PERSON,
          isActive: false,
          phones: [
            { phone: '3101234567', isPrimary: true, hasWhatsapp: false },
          ],
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get(
          '/suppliers?page=1&limit=10&search=repuestos&type=COMPANY&isActive=true',
        )
        .set('Cookie', [`md_access=${accessToken}`])
        .expect(200);
      const body = readBody<{
        data: SupplierRecord[];
        meta: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      }>(response);

      expect(body.meta).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      });
      expect(body.data).toHaveLength(1);
      expect(body.data[0]?.name).toBe('Repuestos Central');
    },
  );

  it('creates suppliers with multiple phones, normalizes the primary phone, and allows duplicate names', async () => {
    const accessToken = await createAccessToken('ADMIN');

    const firstResponse = await request(app.getHttpServer())
      .post('/suppliers')
      .set('Cookie', [`md_access=${accessToken}`])
      .send({
        name: ' Repuestos Central ',
        type: SupplierType.COMPANY,
        contactName: ' Laura Perez ',
        documentType: 'NIT',
        documentNumber: ' 900123456 ',
        email: ' COMPRAS@REPUESTOS.TEST ',
        notes: ' <p>Proveedor preferido</p> ',
        phones: [
          {
            label: 'Principal',
            phone: ' 3001234567 ',
            isPrimary: false,
            hasWhatsapp: true,
          },
          {
            label: 'Bodega',
            phone: ' 3109876543 ',
            isPrimary: false,
            hasWhatsapp: false,
          },
        ],
      })
      .expect(201);
    const firstBody = readBody<SupplierRecord>(firstResponse);

    expect(firstBody.name).toBe('Repuestos Central');
    expect(firstBody.email).toBe('compras@repuestos.test');
    expect(firstBody.phones).toEqual([
      expect.objectContaining({
        label: 'Principal',
        phone: '3001234567',
        isPrimary: true,
        hasWhatsapp: true,
      }),
      expect.objectContaining({
        label: 'Bodega',
        phone: '3109876543',
        isPrimary: false,
        hasWhatsapp: false,
      }),
    ]);

    const duplicateResponse = await request(app.getHttpServer())
      .post('/suppliers')
      .set('Cookie', [`md_access=${accessToken}`])
      .send({
        name: 'Repuestos Central',
        type: SupplierType.COMPANY,
        documentType: 'NIT',
        documentNumber: '900123457',
        email: 'compras+2@repuestos.test',
        phones: [{ phone: '3010000000', isPrimary: true, hasWhatsapp: false }],
      })
      .expect(201);
    const duplicateBody = readBody<SupplierRecord>(duplicateResponse);

    expect(duplicateBody.name).toBe('Repuestos Central');
    expect(duplicateBody.id).not.toBe(firstBody.id);
  });

  it('returns a supplier by id', async () => {
    const accessToken = await createAccessToken('SALES');
    const createResponse = await request(app.getHttpServer())
      .post('/suppliers')
      .set('Cookie', [`md_access=${accessToken}`])
      .send({
        name: 'Autopartes Norte',
        type: SupplierType.COMPANY,
        phones: [{ phone: '3000001111', isPrimary: true, hasWhatsapp: true }],
      })
      .expect(201);
    const created = readBody<SupplierRecord>(createResponse);

    const response = await request(app.getHttpServer())
      .get(`/suppliers/${created.id}`)
      .set('Cookie', [`md_access=${accessToken}`])
      .expect(200);
    const body = readBody<SupplierRecord>(response);

    expect(body.id).toBe(created.id);
    expect(body.phones[0]?.hasWhatsapp).toBe(true);
  });

  it('updates an existing supplier and preserves exactly one primary phone', async () => {
    const accessToken = await createAccessToken('ADMIN');
    const createResponse = await request(app.getHttpServer())
      .post('/suppliers')
      .set('Cookie', [`md_access=${accessToken}`])
      .send({
        name: 'Proveedor Base',
        type: SupplierType.COMPANY,
        phones: [{ phone: '3000000000', isPrimary: true, hasWhatsapp: false }],
      })
      .expect(201);
    const created = readBody<SupplierRecord>(createResponse);

    const response = await request(app.getHttpServer())
      .patch(`/suppliers/${created.id}`)
      .set('Cookie', [`md_access=${accessToken}`])
      .send({
        contactName: ' Andrea Diaz ',
        phones: [
          {
            label: 'Principal',
            phone: ' 3009998888 ',
            isPrimary: false,
            hasWhatsapp: true,
          },
          {
            label: 'Bodega',
            phone: ' 3107776666 ',
            isPrimary: false,
            hasWhatsapp: false,
          },
        ],
      })
      .expect(200);
    const body = readBody<SupplierRecord>(response);

    expect(body.contactName).toBe('Andrea Diaz');
    expect(body.phones).toEqual([
      expect.objectContaining({
        phone: '3009998888',
        isPrimary: true,
        hasWhatsapp: true,
      }),
      expect.objectContaining({
        phone: '3107776666',
        isPrimary: false,
        hasWhatsapp: false,
      }),
    ]);
  });

  it('rejects invalid supplier payloads', async () => {
    const accessToken = await createAccessToken('ADMIN');

    await request(app.getHttpServer())
      .post('/suppliers')
      .set('Cookie', [`md_access=${accessToken}`])
      .send({
        name: '   ',
        type: SupplierType.COMPANY,
        phones: [],
      })
      .expect(400);
  });

  it('returns 404 when the supplier does not exist', async () => {
    const accessToken = await createAccessToken('ADMIN');

    await request(app.getHttpServer())
      .get('/suppliers/missing-supplier')
      .set('Cookie', [`md_access=${accessToken}`])
      .expect(404);
  });
});
