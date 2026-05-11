import { UserRole } from '../../../generated/prisma/enums';
import {
  AdminUserEmailConflictError,
  AdminUsersRepository,
} from './admin-users.repository';

describe('AdminUsersRepository', () => {
  it('looks up users by normalized email and selects mustChangePassword', async () => {
    const user = {
      id: 'user-1',
      email: 'admin@mecanismos.test',
      name: 'Admin User',
      role: UserRole.ADMIN,
      isActive: true,
      mustChangePassword: false,
      lastLoginAt: new Date('2026-05-11T10:00:00.000Z'),
      createdAt: new Date('2026-05-11T08:00:00.000Z'),
      updatedAt: new Date('2026-05-11T09:00:00.000Z'),
    };
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(user),
      },
    };

    const repository = new AdminUsersRepository(prisma as never);

    await expect(
      repository.findByEmail('  ADMIN@MECANISMOS.TEST  '),
    ).resolves.toEqual(user);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'admin@mecanismos.test' },
      select: expect.objectContaining({
        email: true,
        mustChangePassword: true,
      }),
    });
  });

  it('maps unique email violations from user creation into a domain conflict error', async () => {
    const prisma = {
      $transaction: jest.fn().mockRejectedValue({ code: 'P2002' }),
    };

    const repository = new AdminUsersRepository(prisma as never);

    await expect(
      repository.create({
        email: 'nuevo@mecanismos.test',
        name: 'Nuevo Usuario',
        role: UserRole.SALES,
        isActive: true,
        mustChangePassword: true,
        passwordHash: 'hashed-password',
        passwordUpdatedAt: new Date('2026-05-11T10:00:00.000Z'),
      }),
    ).rejects.toBeInstanceOf(AdminUserEmailConflictError);
  });

  it('lists users with search, role, and active filters while hiding secrets', async () => {
    const prisma = {
      user: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };

    const repository = new AdminUsersRepository(prisma as never);

    await expect(
      repository.findMany({
        page: 2,
        limit: 5,
        search: '  admin  ',
        role: UserRole.ADMIN,
        isActive: true,
      }),
    ).resolves.toEqual({ items: [], total: 0, page: 2, limit: 5 });

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: {
        role: UserRole.ADMIN,
        isActive: true,
        OR: [
          { email: { contains: 'admin', mode: 'insensitive' } },
          { name: { contains: 'admin', mode: 'insensitive' } },
        ],
      },
      orderBy: [{ createdAt: 'desc' }],
      skip: 5,
      take: 5,
      select: expect.not.objectContaining({
        account: true,
        session: true,
      }),
    });
  });

  it('revokes active refresh sessions for a user without exposing token digests', async () => {
    const prisma = {
      session: {
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
    };

    const repository = new AdminUsersRepository(prisma as never);
    const revokedAt = new Date('2026-05-11T11:00:00.000Z');

    await expect(
      repository.revokeRefreshSessionsForUser('user-9', revokedAt),
    ).resolves.toBe(2);

    expect(prisma.session.updateMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-9',
        revokedAt: null,
      },
      data: {
        revokedAt,
        updatedAt: revokedAt,
      },
    });
  });
});
