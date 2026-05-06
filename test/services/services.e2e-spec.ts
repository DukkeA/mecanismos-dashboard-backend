jest.mock('../../src/prisma.service', () => ({
  PrismaService: class PrismaServiceMock {
    async $connect() {}
    async $disconnect() {}
  },
}));

import {
  BadRequestException,
  ConflictException,
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { slugify } from '../../src/common/strings/slugify';
import { AppModule } from '../../src/app.module';
import { ServicesService } from '../../src/services/services.service';

type ServicePayload = {
  name: string;
  description?: string;
  isActive?: boolean;
};

type ServiceRecord = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

function buildServicesServiceOverride() {
  const services = new Map<string, ServiceRecord>();
  let sequence = 0;

  return {
    create(payload: ServicePayload) {
      const record = buildServiceRecord(payload, `service-${++sequence}`);

      ensureSlugIsAvailable(record.slug, services);
      services.set(record.id, record);

      return record;
    },

    findAll(query: {
      page?: number;
      limit?: number;
      search?: string;
      isActive?: boolean;
    }) {
      const page = query.page ?? 1;
      const limit = query.limit ?? 10;
      const search = query.search?.toLowerCase();

      const filtered = [...services.values()].filter((service) => {
        if (
          query.isActive !== undefined &&
          service.isActive !== query.isActive
        ) {
          return false;
        }

        if (!search) {
          return true;
        }

        return [service.name, service.slug, service.description].some((value) =>
          value?.toLowerCase().includes(search),
        );
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
      const service = services.get(id);

      if (!service) {
        throw new NotFoundException(`Service ${id} not found`);
      }

      return service;
    },

    update(id: string, payload: Partial<ServicePayload>) {
      const current = services.get(id);

      if (!current) {
        throw new NotFoundException(`Service ${id} not found`);
      }

      const nextPayload: ServicePayload = {
        ...current,
        ...payload,
      };
      const record = buildServiceRecord(nextPayload, id, current.createdAt);

      ensureSlugIsAvailable(record.slug, services, id);
      services.set(id, record);

      return record;
    },
  };
}

function ensureSlugIsAvailable(
  slug: string,
  services: Map<string, ServiceRecord>,
  currentId?: string,
) {
  const conflicting = [...services.values()].find(
    (service) => service.slug === slug && service.id !== currentId,
  );

  if (conflicting) {
    throw new ConflictException('Service catalog slug already exists');
  }
}

function buildServiceRecord(
  payload: ServicePayload,
  id: string,
  createdAt: string = new Date('2026-05-05T10:00:00.000Z').toISOString(),
): ServiceRecord {
  const slug = slugify(payload.name);

  if (!slug) {
    throw new BadRequestException(
      'Service name must contain letters or numbers',
    );
  }

  return {
    id,
    name: payload.name.trim(),
    slug,
    description: normalizeOptionalString(payload.description),
    isActive: payload.isActive ?? true,
    createdAt,
    updatedAt: new Date('2026-05-05T11:00:00.000Z').toISOString(),
  };
}

function normalizeOptionalString(value?: string | null) {
  const normalized = value?.trim();

  return normalized ? normalized : undefined;
}

describe('ServicesController (e2e)', () => {
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
      .overrideProvider(ServicesService)
      .useValue(buildServicesServiceOverride())
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

  it('rejects unauthenticated service listing', async () => {
    await request(app.getHttpServer()).get('/services').expect(401);
  });

  it('rejects authenticated MECHANIC service listing', async () => {
    const accessToken = await createAccessToken('MECHANIC');

    await request(app.getHttpServer())
      .get('/services')
      .set('Cookie', [`md_access=${accessToken}`])
      .expect(403);
  });

  it.each(['ADMIN', 'SALES'] as const)(
    'allows authenticated %s users to create, list, get, and update services',
    async (role) => {
      const accessToken = await createAccessToken(role);
      const createResponse = await request(app.getHttpServer())
        .post('/services')
        .set('Cookie', [`md_access=${accessToken}`])
        .send({
          name: '  Diagnóstico electrónico  ',
          description: '  Lectura inicial  ',
        })
        .expect(201);
      const created = readBody<ServiceRecord>(createResponse);

      expect(created.slug).toBe('diagnostico-electronico');

      const listResponse = await request(app.getHttpServer())
        .get('/services?page=1&limit=10&search=diag&isActive=true')
        .set('Cookie', [`md_access=${accessToken}`])
        .expect(200);
      const listBody = readBody<{
        data: ServiceRecord[];
        meta: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      }>(listResponse);

      expect(listBody.meta).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      });
      expect(listBody.data[0]?.id).toBe(created.id);

      const getResponse = await request(app.getHttpServer())
        .get(`/services/${created.id}`)
        .set('Cookie', [`md_access=${accessToken}`])
        .expect(200);

      expect(readBody<ServiceRecord>(getResponse).id).toBe(created.id);

      const updateResponse = await request(app.getHttpServer())
        .patch(`/services/${created.id}`)
        .set('Cookie', [`md_access=${accessToken}`])
        .send({
          name: '  Calibración de bomba  ',
          description: '  Banco actualizado  ',
          isActive: false,
        })
        .expect(200);
      const updated = readBody<ServiceRecord>(updateResponse);

      expect(updated.slug).toBe('calibracion-de-bomba');
      expect(updated.isActive).toBe(false);
    },
  );

  it('rejects duplicate canonical service names with 409', async () => {
    const accessToken = await createAccessToken('ADMIN');

    await request(app.getHttpServer())
      .post('/services')
      .set('Cookie', [`md_access=${accessToken}`])
      .send({ name: 'Diagnóstico' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/services')
      .set('Cookie', [`md_access=${accessToken}`])
      .send({ name: 'diagnostico' })
      .expect(409);
  });

  it('rejects canonical rename collisions with 409 on update', async () => {
    const accessToken = await createAccessToken('ADMIN');

    const firstCreateResponse = await request(app.getHttpServer())
      .post('/services')
      .set('Cookie', [`md_access=${accessToken}`])
      .send({ name: 'Diagnóstico' })
      .expect(201);
    const firstCreated = readBody<ServiceRecord>(firstCreateResponse);

    await request(app.getHttpServer())
      .post('/services')
      .set('Cookie', [`md_access=${accessToken}`])
      .send({ name: 'Calibración' })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/services/${firstCreated.id}`)
      .set('Cookie', [`md_access=${accessToken}`])
      .send({ name: 'calibracion' })
      .expect(409);
  });

  it('rejects invalid service payloads', async () => {
    const accessToken = await createAccessToken('ADMIN');

    await request(app.getHttpServer())
      .post('/services')
      .set('Cookie', [`md_access=${accessToken}`])
      .send({ name: '   ' })
      .expect(400);
  });

  it('rejects names whose canonical slug becomes empty', async () => {
    const accessToken = await createAccessToken('ADMIN');

    await request(app.getHttpServer())
      .post('/services')
      .set('Cookie', [`md_access=${accessToken}`])
      .send({ name: '!!!' })
      .expect(400);
  });

  it('returns 404 when the service does not exist', async () => {
    const accessToken = await createAccessToken('SALES');

    await request(app.getHttpServer())
      .get('/services/missing-service')
      .set('Cookie', [`md_access=${accessToken}`])
      .expect(404);
  });
});
