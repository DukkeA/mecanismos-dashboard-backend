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
  ExecutionContext,
  INestApplication,
  NotFoundException,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import type { Request } from 'express';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { JwtAuthGuard } from '../../src/auth/jwt-auth.guard';
import { RolesGuard } from '../../src/auth/roles.guard';
import { ProcurementService } from '../../src/procurement/procurement.service';

class TestJwtAuthGuard {
  canActivate(context: ExecutionContext) {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: { sub: string; role: string } }>();
    const role = request.headers['x-test-role'];

    if (!role) {
      throw new UnauthorizedException('Access token missing or invalid.');
    }

    request.user = {
      sub: 'test-user',
      role: Array.isArray(role) ? role[0] : role,
    };
    return true;
  }
}

describe('Supplier quotes routes (e2e)', () => {
  let app: INestApplication<App>;

  const procurementService = {
    createQuote: jest
      .fn()
      .mockResolvedValue({ id: 'quote-2', quotedCost: 182000 }),
    updateQuote: jest
      .fn()
      .mockResolvedValue({ id: 'quote-2', correctionReason: 'fixed' }),
    voidQuote: jest.fn().mockResolvedValue({ id: 'quote-2', status: 'VOIDED' }),
    findSupplierQuoteTimeline: jest
      .fn()
      .mockImplementation((supplierId: string) => {
        if (supplierId === 'missing-supplier') {
          throw new NotFoundException('Supplier missing-supplier not found');
        }

        return {
          data: [{ id: 'quote-2', status: 'VOIDED' }],
          meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
        };
      }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.AUTH_ACCESS_TOKEN_SECRET = 'access-secret';
    process.env.AUTH_REFRESH_TOKEN_SECRET = 'refresh-secret';
    process.env.AUTH_ALLOWED_ORIGINS = 'http://localhost:5173';

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(TestJwtAuthGuard)
      .overrideProvider(ProcurementService)
      .useValue(procurementService)
      .overrideProvider(RolesGuard)
      .useFactory({
        factory: (reflector: Reflector) => new RolesGuard(reflector),
        inject: [Reflector],
      })
      .compile();

    app = moduleFixture.createNestApplication();
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
    await app.close();
  });

  it('returns 403 for mechanic quote access and keeps voided history visible for sales', async () => {
    await request(app.getHttpServer())
      .get('/suppliers/supplier-1/quotes')
      .set('x-test-role', 'MECHANIC')
      .expect(403);

    await request(app.getHttpServer())
      .get('/suppliers/supplier-1/quotes')
      .set('x-test-role', 'SALES')
      .expect(200)
      .expect(({ body }: { body: { data: Array<{ status: string }> } }) => {
        expect(body.data[0].status).toBe('VOIDED');
      });
  });

  it('accepts includeVoided query values for supplier quote timelines', async () => {
    await request(app.getHttpServer())
      .get(
        '/suppliers/supplier-1/quotes?inventoryItemId=item-1&includeVoided=true',
      )
      .set('x-test-role', 'SALES')
      .expect(200);

    expect(procurementService.findSupplierQuoteTimeline).toHaveBeenCalledWith(
      'supplier-1',
      expect.objectContaining({
        inventoryItemId: 'item-1',
        includeVoided: true,
      }),
    );
  });

  it('returns 404 when the supplier quote timeline parent does not exist', () => {
    return request(app.getHttpServer())
      .get('/suppliers/missing-supplier/quotes')
      .set('x-test-role', 'ADMIN')
      .expect(404);
  });
});
