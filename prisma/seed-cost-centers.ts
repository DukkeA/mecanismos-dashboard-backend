import { randomUUID } from 'node:crypto';

const DEFAULT_COST_CENTERS = [
  {
    code: 'GENERAL',
    name: 'General',
    isActive: true,
  },
  {
    code: 'BODEGA',
    name: 'Bodega',
    isActive: true,
  },
  {
    code: 'OFICINA',
    name: 'Oficina',
    isActive: true,
  },
] as const;

type CostCentersSeedPrismaClient = {
  costCenter: {
    upsert(args: {
      where: { code: string };
      create: {
        id: string;
        code: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
      };
      update: {
        name: string;
        isActive: boolean;
        updatedAt: Date;
      };
    }): Promise<unknown>;
  };
};

export async function seedDefaultCostCenters(
  prisma: CostCentersSeedPrismaClient,
  now: Date,
) {
  for (const costCenter of DEFAULT_COST_CENTERS) {
    await prisma.costCenter.upsert({
      where: { code: costCenter.code },
      create: {
        id: randomUUID(),
        code: costCenter.code,
        name: costCenter.name,
        isActive: costCenter.isActive,
        createdAt: now,
        updatedAt: now,
      },
      update: {
        name: costCenter.name,
        isActive: costCenter.isActive,
        updatedAt: now,
      },
    });
  }
}
