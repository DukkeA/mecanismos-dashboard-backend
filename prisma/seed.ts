import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { hash } from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const BCRYPT_ROUNDS = 12;

const SEED_USERS = [
  {
    email: 'admin@mecanismos.test',
    name: 'Admin Mecanismos',
    password: 'Admin123!',
    role: 'ADMIN' as const,
  },
  {
    email: 'ventas@mecanismos.test',
    name: 'Ventas Mecanismos',
    password: 'Ventas123!',
    role: 'SALES' as const,
  },
  {
    email: 'mecanico@mecanismos.test',
    name: 'Mecanico Mecanismos',
    password: 'Mecanico123!',
    role: 'MECHANIC' as const,
  },
];

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to seed the database');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    }),
  });

  const now = new Date();

  try {
    for (const seedUser of SEED_USERS) {
      const email = seedUser.email.toLowerCase();
      const passwordHash = await hash(seedUser.password, BCRYPT_ROUNDS);

      const user = await prisma.user.upsert({
        where: { email },
        create: {
          id: randomUUID(),
          email,
          name: seedUser.name,
          role: seedUser.role,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
        update: {
          name: seedUser.name,
          role: seedUser.role,
          isActive: true,
          updatedAt: now,
        },
      });

      await prisma.account.upsert({
        where: { userId: user.id },
        create: {
          id: randomUUID(),
          userId: user.id,
          passwordHash,
          passwordUpdatedAt: now,
          createdAt: now,
          updatedAt: now,
        },
        update: {
          passwordHash,
          passwordUpdatedAt: now,
          updatedAt: now,
        },
      });

      console.log(`Seeded ${seedUser.role} user: ${email}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
