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
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import type { Request } from 'express';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { JwtAuthGuard } from '../../src/auth/jwt-auth.guard';
import { RolesGuard } from '../../src/auth/roles.guard';
import { InventoryService } from '../../src/inventory/inventory.service';
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

describe('Inventory items routes (e2e)', () => {
  let app: INestApplication<App>;

  const inventoryService = {
    findAll: jest.fn().mockResolvedValue({
      data: [
        { id: 'item-1', currentStock: 3 },
        { id: 'item-2', currentStock: 0 },
      ],
      meta: { page: 1, limit: 10, total: 2, totalPages: 1 },
    }),
    findOne: jest.fn().mockResolvedValue({ id: 'item-2', currentStock: 0 }),
  };
  const procurementService = {
    findItemQuoteLookup: jest
      .fn()
      .mockResolvedValue({ latestBySupplier: [], history: [] }),
  };

  beforeEach(async () => {
    process.env.AUTH_ACCESS_TOKEN_SECRET = 'access-secret';
    process.env.AUTH_REFRESH_TOKEN_SECRET = 'refresh-secret';
    process.env.AUTH_ALLOWED_ORIGINS = 'http://localhost:5173';

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(TestJwtAuthGuard)
      .overrideProvider(InventoryService)
      .useValue(inventoryService)
      .overrideProvider(ProcurementService)
      .useValue(procurementService)
      .overrideProvider(RolesGuard)
      .useFactory({
        factory: (reflector: Reflector) => new RolesGuard(reflector),
        inject: [Reflector],
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns 401 for unauthenticated inventory list', () => {
    return request(app.getHttpServer()).get('/inventory-items').expect(401);
  });

  it('returns 403 for mechanic inventory list access', () => {
    return request(app.getHttpServer())
      .get('/inventory-items')
      .set('x-test-role', 'MECHANIC')
      .expect(403);
  });

  it('returns derived stock for admin item list and zero-stock item detail', async () => {
    await request(app.getHttpServer())
      .get('/inventory-items')
      .set('x-test-role', 'ADMIN')
      .expect(200)
      .expect(
        ({ body }: { body: { data: Array<{ currentStock: number }> } }) => {
          expect(body.data[0].currentStock).toBe(3);
        },
      );

    await request(app.getHttpServer())
      .get('/inventory-items/item-2')
      .set('x-test-role', 'SALES')
      .expect(200)
      .expect(({ body }: { body: { currentStock: number } }) => {
        expect(body.currentStock).toBe(0);
      });
  });
});
