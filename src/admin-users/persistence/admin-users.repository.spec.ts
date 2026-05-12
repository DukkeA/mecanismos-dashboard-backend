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
    const findUnique = jest.fn().mockResolvedValue(user);
    const prisma = {
      user: {
        findUnique,
      },
    };

    const repository = new AdminUsersRepository(prisma as never);

    await expect(
      repository.findByEmail('  ADMIN@MECANISMOS.TEST  '),
    ).resolves.toEqual(user);

    expect(findUnique).toHaveBeenCalledWith({
      where: { email: 'admin@mecanismos.test' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
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
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = {
      user: {
        findMany,
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

    expect(findMany).toHaveBeenCalledWith({
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
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
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

  it('clears recovery phrase credentials when updating a password', async () => {
    const updatedUser = {
      id: 'user-2',
      email: 'ventas@mecanismos.test',
      name: 'Ventas',
      role: UserRole.SALES,
      isActive: true,
      mustChangePassword: true,
      lastLoginAt: null,
      createdAt: new Date('2026-05-11T08:00:00.000Z'),
      updatedAt: new Date('2026-05-12T09:00:00.000Z'),
    };
    const accountUpdate = jest.fn().mockResolvedValue({});
    const userUpdate = jest.fn().mockResolvedValue(updatedUser);
    const prisma = {
      $transaction: jest.fn(async (callback: never) =>
        (callback as (tx: unknown) => Promise<unknown>)({
          account: { update: accountUpdate },
          user: { update: userUpdate },
        }),
      ),
    };
    const passwordUpdatedAt = new Date('2026-05-12T09:00:00.000Z');

    const repository = new AdminUsersRepository(prisma as never);

    await expect(
      repository.updatePassword('user-2', {
        passwordHash: 'reset-hash',
        mustChangePassword: true,
        passwordUpdatedAt,
      }),
    ).resolves.toEqual(updatedUser);

    expect(accountUpdate).toHaveBeenCalledWith({
      where: { userId: 'user-2' },
      data: {
        passwordHash: 'reset-hash',
        passwordUpdatedAt,
        recoveryPhraseHash: null,
        recoveryPhraseGeneratedAt: null,
        recoveryPhraseConsumedAt: passwordUpdatedAt,
        updatedAt: passwordUpdatedAt,
      },
    });
    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: 'user-2' },
      data: {
        mustChangePassword: true,
        authVersion: { increment: 1 },
        updatedAt: passwordUpdatedAt,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  });

  it('bumps auth version when deactivating a user', async () => {
    const prisma = {
      user: {
        update: jest.fn().mockResolvedValue({ id: 'user-2', isActive: false }),
      },
    };
    const repository = new AdminUsersRepository(prisma as never);

    await repository.update('user-2', { isActive: false });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-2' },
      data: {
        isActive: false,
        authVersion: { increment: 1 },
        updatedAt: expect.any(Date) as Date,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  });
});
