import { seedDefaultCostCenters } from '../../prisma/seed-cost-centers';
import type { Prisma, PrismaClient } from '../../generated/prisma/client';

type UpsertArgs = Prisma.CostCenterUpsertArgs;

void (seedDefaultCostCenters satisfies (
  prisma: PrismaClient,
  now: Date,
) => Promise<void>);

describe('cost center default seeds', () => {
  it('upserts GENERAL, BODEGA, and OFICINA by canonical code', async () => {
    const upsert = jest
      .fn<Promise<unknown>, [UpsertArgs]>()
      .mockResolvedValue(undefined);
    const prisma = {
      costCenter: {
        upsert,
      },
    };
    const now = new Date('2026-05-09T12:00:00.000Z');

    await seedDefaultCostCenters(prisma, now);

    expect(upsert).toHaveBeenCalledTimes(3);
    const firstCall = upsert.mock.calls[0]?.[0];
    const secondCall = upsert.mock.calls[1]?.[0];
    const thirdCall = upsert.mock.calls[2]?.[0];

    expect(firstCall).toBeDefined();
    expect(firstCall?.where).toEqual({ code: 'GENERAL' });
    expect(firstCall?.create).toMatchObject({
      code: 'GENERAL',
      name: 'General',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    expect(firstCall?.update).toMatchObject({
      name: 'General',
      isActive: true,
      updatedAt: now,
    });
    expect(secondCall?.where).toEqual({ code: 'BODEGA' });
    expect(thirdCall?.where).toEqual({ code: 'OFICINA' });
  });

  it('reuses the same canonical upsert boundary every time the helper runs', async () => {
    const upsert = jest
      .fn<Promise<unknown>, [UpsertArgs]>()
      .mockResolvedValue(undefined);
    const prisma = {
      costCenter: {
        upsert,
      },
    };

    await seedDefaultCostCenters(prisma, new Date('2026-05-09T12:00:00.000Z'));
    await seedDefaultCostCenters(prisma, new Date('2026-05-10T12:00:00.000Z'));

    const calledCodes = upsert.mock.calls.map(([args]) => args.where.code);

    expect(calledCodes).toEqual([
      'GENERAL',
      'BODEGA',
      'OFICINA',
      'GENERAL',
      'BODEGA',
      'OFICINA',
    ]);
  });
});
