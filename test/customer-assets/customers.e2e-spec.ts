jest.mock('../../src/prisma.service', () => {
  const authPrismaMock = jest.requireActual<
    typeof import('../support/auth-prisma-mock')
  >('../support/auth-prisma-mock');

  return {
    PrismaService: class PrismaServiceMock {
      user = {
        findFirst: jest.fn(({ where }: { where: { id: string } }) =>
          Promise.resolve(authPrismaMock.findActiveAuthUserById(where.id)),
        ),
      };

      async $connect() {}
      async $disconnect() {}
    },
  };
});

import {
  ConflictException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { LEXICAL_NOTE_EXAMPLE } from '../../src/common/rich-text/lexical-note';
import { CustomersService } from '../../src/customers/customers.service';
import { authJwtPayloadForRole } from '../support/auth-prisma-mock';

const CustomerDocumentType = {
  CEDULA: 'CEDULA',
  NIT: 'NIT',
} as const;

describe('CustomersController (e2e)', () => {
  const customersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  let app: INestApplication<App>;

  function readBody<T>(response: request.Response): T {
    return response.body as T;
  }

  async function createAccessToken(role: 'ADMIN' | 'SALES' | 'MECHANIC') {
    const jwtService = new JwtService();

    return jwtService.signAsync(authJwtPayloadForRole(role), {
      secret: process.env.AUTH_ACCESS_TOKEN_SECRET,
      expiresIn: 900,
    });
  }

  beforeEach(async () => {
    process.env.AUTH_ACCESS_TOKEN_SECRET = 'access-secret';
    process.env.AUTH_REFRESH_TOKEN_SECRET = 'refresh-secret';
    process.env.AUTH_ALLOWED_ORIGINS = 'http://localhost:5173';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(CustomersService)
      .useValue(customersService)
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
    jest.clearAllMocks();
    if (app) {
      await app.close();
    }
  });

  it('rejects unauthenticated customer listing', async () => {
    await request(app.getHttpServer()).get('/customers').expect(401);
  });

  it('rejects authenticated MECHANIC customer listing', async () => {
    const accessToken = await createAccessToken('MECHANIC');

    await request(app.getHttpServer())
      .get('/customers')
      .set('Cookie', [`md_access=${accessToken}`])
      .expect(403);
  });

  it.each(['ADMIN', 'SALES'] as const)(
    'allows authenticated %s users to list customers',
    async (role) => {
      customersService.findAll.mockResolvedValue({
        data: [
          {
            id: 'customer-1',
            name: 'Ana Gomez',
            phone: '3001234567',
            documentType: CustomerDocumentType.CEDULA,
            documentNumber: '123456789',
            email: 'ana@mecanismos.test',
            notes: LEXICAL_NOTE_EXAMPLE,
            createdAt: '2026-05-05T10:00:00.000Z',
            updatedAt: '2026-05-05T10:00:00.000Z',
          },
        ],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      });

      const accessToken = await createAccessToken(role);
      const response = await request(app.getHttpServer())
        .get('/customers?page=1&limit=10&search=ana')
        .set('Cookie', [`md_access=${accessToken}`])
        .expect(200);
      const body = readBody<{
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
      expect(customersService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 10,
          search: 'ana',
        }),
      );
    },
  );

  it('creates a customer with optional notes', async () => {
    customersService.create.mockResolvedValue({
      id: 'customer-1',
      name: 'Ana Gomez',
      phone: '3001234567',
      documentType: CustomerDocumentType.CEDULA,
      documentNumber: '123456789',
      email: 'ana@mecanismos.test',
      notes: LEXICAL_NOTE_EXAMPLE,
      createdAt: '2026-05-05T10:00:00.000Z',
      updatedAt: '2026-05-05T10:00:00.000Z',
    });

    const accessToken = await createAccessToken('ADMIN');
    const response = await request(app.getHttpServer())
      .post('/customers')
      .set('Cookie', [`md_access=${accessToken}`])
      .send({
        name: ' Ana Gomez ',
        phone: ' 3001234567 ',
        documentType: CustomerDocumentType.CEDULA,
        documentNumber: ' 123456789 ',
        email: ' ANA@MECANISMOS.TEST ',
        notes: LEXICAL_NOTE_EXAMPLE,
      })
      .expect(201);
    const body = readBody<{ id: string }>(response);

    expect(body.id).toBe('customer-1');
    expect(customersService.create).toHaveBeenCalledWith({
      name: 'Ana Gomez',
      phone: '3001234567',
      documentType: CustomerDocumentType.CEDULA,
      documentNumber: '123456789',
      email: 'ana@mecanismos.test',
      notes: LEXICAL_NOTE_EXAMPLE,
    });
  });

  it('rejects invalid customer payloads', async () => {
    const accessToken = await createAccessToken('ADMIN');

    await request(app.getHttpServer())
      .post('/customers')
      .set('Cookie', [`md_access=${accessToken}`])
      .send({
        name: '   ',
        phone: '3001234567',
        documentType: CustomerDocumentType.CEDULA,
        documentNumber: '123456789',
      })
      .expect(400);
  });

  it('maps duplicate customer document errors to 409', async () => {
    customersService.create.mockRejectedValue(
      new ConflictException('Customer document already exists'),
    );

    const accessToken = await createAccessToken('ADMIN');
    await request(app.getHttpServer())
      .post('/customers')
      .set('Cookie', [`md_access=${accessToken}`])
      .send({
        name: 'Ana Gomez',
        phone: '3001234567',
        documentType: CustomerDocumentType.CEDULA,
        documentNumber: '123456789',
      })
      .expect(409);
  });

  it('returns a customer by id', async () => {
    customersService.findOne.mockResolvedValue({
      id: 'customer-1',
      name: 'Ana Gomez',
      phone: '3001234567',
      documentType: CustomerDocumentType.CEDULA,
      documentNumber: '123456789',
      email: 'ana@mecanismos.test',
      notes: null,
      createdAt: '2026-05-05T10:00:00.000Z',
      updatedAt: '2026-05-05T10:00:00.000Z',
    });

    const accessToken = await createAccessToken('SALES');
    const response = await request(app.getHttpServer())
      .get('/customers/customer-1')
      .set('Cookie', [`md_access=${accessToken}`])
      .expect(200);
    const body = readBody<{ id: string }>(response);

    expect(body.id).toBe('customer-1');
    expect(customersService.findOne).toHaveBeenCalledWith('customer-1');
  });

  it('updates an existing customer', async () => {
    customersService.update.mockResolvedValue({
      id: 'customer-1',
      name: 'Ana Gomez Restrepo',
      phone: '3001234567',
      documentType: CustomerDocumentType.CEDULA,
      documentNumber: '123456789',
      email: 'ana+vip@mecanismos.test',
      notes: LEXICAL_NOTE_EXAMPLE,
      createdAt: '2026-05-05T10:00:00.000Z',
      updatedAt: '2026-05-05T11:00:00.000Z',
    });

    const accessToken = await createAccessToken('ADMIN');
    const response = await request(app.getHttpServer())
      .patch('/customers/customer-1')
      .set('Cookie', [`md_access=${accessToken}`])
      .send({
        name: ' Ana Gomez Restrepo ',
        email: ' ANA+VIP@MECANISMOS.TEST ',
        notes: LEXICAL_NOTE_EXAMPLE,
      })
      .expect(200);
    const body = readBody<{ name: string }>(response);

    expect(body.name).toBe('Ana Gomez Restrepo');
    expect(customersService.update).toHaveBeenCalledWith('customer-1', {
      name: 'Ana Gomez Restrepo',
      email: 'ana+vip@mecanismos.test',
      notes: LEXICAL_NOTE_EXAMPLE,
    });
  });
});
