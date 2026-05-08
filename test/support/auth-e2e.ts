import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';

const seededCredentials = {
  ADMIN: {
    email: 'admin@mecanismos.test',
    password: 'Admin123!',
  },
  SALES: {
    email: 'ventas@mecanismos.test',
    password: 'Ventas123!',
  },
  MECHANIC: {
    email: 'mecanico@mecanismos.test',
    password: 'Mecanico123!',
  },
} as const;

export async function loginAsRole(
  app: INestApplication<App>,
  role: keyof typeof seededCredentials,
): Promise<string[]> {
  const response = await request(app.getHttpServer())
    .post('/auth/login')
    .send(seededCredentials[role])
    .expect(200);

  const cookies = response.headers['set-cookie'];

  return Array.isArray(cookies) ? cookies : [];
}
