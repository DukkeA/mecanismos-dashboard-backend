import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '../../src/prisma/prisma.service';
import { loginAsRole } from '../support/auth-e2e';
import { createE2EApp } from '../support/create-e2e-app';

describe('Brand normalized reuse (real db e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env.AUTH_ACCESS_TOKEN_SECRET = 'access-secret';
    process.env.AUTH_REFRESH_TOKEN_SECRET = 'refresh-secret';
    process.env.AUTH_ALLOWED_ORIGINS = 'http://localhost:5173';

    app = await createE2EApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('reuses one Brand row for Bosch/BOSCH/BoScH across vehicle and component creates', async () => {
    const cookies = await loginAsRole(app, 'ADMIN');
    const documentNumber = `brand-reuse-${Date.now()}`;
    const vehiclePlate = `BR${Date.now().toString().slice(-4)}A`;
    const inlineVehiclePlate = `BR${Date.now().toString().slice(-4)}B`;

    const vehicleResponse = await request(app.getHttpServer())
      .post('/vehicles')
      .set('Cookie', cookies)
      .send({
        customer: {
          name: 'Brand Reuse Customer',
          phone: '3001112233',
          documentType: 'CEDULA',
          documentNumber,
        },
        brand: { name: ' Bosch ' },
        modelReference: 'BT-50',
        plate: vehiclePlate,
      })
      .expect(201);

    const componentResponse = await request(app.getHttpServer())
      .post('/components')
      .set('Cookie', cookies)
      .send({
        customer: {
          name: 'Brand Reuse Customer',
          phone: '3001112233',
          documentType: 'CEDULA',
          documentNumber,
        },
        componentType: { name: 'Alternador Brand Reuse' },
        brand: { name: ' BOSCH ' },
        reference: 'ALT-90A',
        vehicle: {
          brand: { name: ' BoScH ' },
          modelReference: 'Inline BT-50',
          plate: inlineVehiclePlate,
        },
      })
      .expect(201);

    const brands = await prisma.brand.findMany({
      where: { normalizedName: 'bosch' },
      select: { id: true, name: true, normalizedName: true },
    });
    const inlineVehicle = await prisma.vehicle.findUniqueOrThrow({
      where: { plate: inlineVehiclePlate },
      select: { brandId: true },
    });

    expect(brands).toHaveLength(1);
    expect(brands[0]).toMatchObject({ name: 'Bosch', normalizedName: 'bosch' });
    expect(vehicleResponse.body).toMatchObject({ brandId: brands[0].id });
    expect(componentResponse.body).toMatchObject({ brandId: brands[0].id });
    expect(inlineVehicle.brandId).toBe(brands[0].id);
  });
});
