import { AuthSessionRepository } from './auth-session.repository';

describe('AuthSessionRepository', () => {
  it('looks up active password credentials by normalized email', async () => {
    const account = {
      id: 'account-1',
      passwordHash: 'hashed-password',
      user: {
        id: 'user-1',
        email: 'admin@mecanismos.test',
        name: 'Admin',
        role: 'ADMIN',
        isActive: true,
      },
    };

    const prisma = {
      account: {
        findFirst: jest.fn().mockResolvedValue(account),
      },
    };

    const repository = new AuthSessionRepository(prisma as never);

    await expect(
      repository.findActivePasswordCredentialByEmail(
        '  ADMIN@MECANISMOS.TEST  ',
      ),
    ).resolves.toEqual(account);

    expect(prisma.account.findFirst).toHaveBeenCalledWith({
      where: {
        user: {
          email: 'admin@mecanismos.test',
          isActive: true,
        },
      },
      include: {
        user: true,
      },
    });
  });

  it('rotates a refresh session by creating a replacement and revoking the current row', async () => {
    const replacementSession = { id: 'session-2', familyId: 'family-1' };
    const tx = {
      session: {
        create: jest.fn().mockResolvedValue(replacementSession),
        update: jest.fn().mockResolvedValue({ id: 'session-1' }),
      },
    };
    const prisma = {
      $transaction: jest
        .fn()
        .mockImplementation(
          (callback: (input: typeof tx) => Promise<unknown>) => callback(tx),
        ),
    };

    const repository = new AuthSessionRepository(prisma as never);
    const rotatedAt = new Date('2026-05-04T12:00:00.000Z');
    const expiresAt = new Date('2026-05-18T12:00:00.000Z');

    await expect(
      repository.rotateRefreshSession({
        currentSessionId: 'session-1',
        newSessionId: 'session-2',
        userId: 'user-1',
        familyId: 'family-1',
        newTokenDigest: 'digest-2',
        expiresAt,
        rotatedAt,
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
      }),
    ).resolves.toEqual({
      revokedSessionId: 'session-1',
      replacementSession,
    });

    expect(tx.session.create).toHaveBeenCalledWith({
      data: {
        id: 'session-2',
        userId: 'user-1',
        familyId: 'family-1',
        tokenDigest: 'digest-2',
        expiresAt,
        lastUsedAt: rotatedAt,
        updatedAt: rotatedAt,
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
      },
    });
    expect(tx.session.update).toHaveBeenCalledWith({
      where: { id: 'session-1' },
      data: {
        revokedAt: rotatedAt,
        replacedBySessionId: 'session-2',
        lastUsedAt: rotatedAt,
        updatedAt: rotatedAt,
      },
    });
  });

  it('revokes an entire refresh family after token reuse is detected', async () => {
    const prisma = {
      session: {
        updateMany: jest.fn().mockResolvedValue({ count: 3 }),
      },
    };

    const repository = new AuthSessionRepository(prisma as never);
    const revokedAt = new Date('2026-05-04T13:00:00.000Z');

    await expect(
      repository.revokeRefreshFamily('family-1', revokedAt),
    ).resolves.toBe(3);

    expect(prisma.session.updateMany).toHaveBeenCalledWith({
      where: {
        familyId: 'family-1',
        revokedAt: null,
      },
      data: {
        revokedAt,
        updatedAt: revokedAt,
      },
    });
  });

  it('revokes the presented refresh session during logout', async () => {
    const prisma = {
      session: {
        update: jest
          .fn()
          .mockResolvedValue({ id: 'session-1', revokedAt: true }),
      },
    };

    const repository = new AuthSessionRepository(prisma as never);
    const revokedAt = new Date('2026-05-04T14:00:00.000Z');

    await repository.revokeRefreshSession('session-1', revokedAt);

    expect(prisma.session.update).toHaveBeenCalledWith({
      where: { id: 'session-1' },
      data: {
        revokedAt,
        updatedAt: revokedAt,
      },
    });
  });

  it('creates a refresh session row for a new login', async () => {
    const createdSession = { id: 'session-1', familyId: 'family-1' };
    const prisma = {
      session: {
        create: jest.fn().mockResolvedValue(createdSession),
      },
    };

    const repository = new AuthSessionRepository(prisma as never);
    const expiresAt = new Date('2026-05-18T12:00:00.000Z');
    const lastUsedAt = new Date('2026-05-04T12:00:00.000Z');

    await expect(
      repository.createRefreshSession({
        sessionId: 'session-1',
        userId: 'user-1',
        familyId: 'family-1',
        tokenDigest: 'digest-1',
        expiresAt,
        lastUsedAt,
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
      }),
    ).resolves.toEqual(createdSession);

    expect(prisma.session.create).toHaveBeenCalledWith({
      data: {
        id: 'session-1',
        userId: 'user-1',
        familyId: 'family-1',
        tokenDigest: 'digest-1',
        expiresAt,
        lastUsedAt,
        updatedAt: lastUsedAt,
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
      },
    });
  });

  it('looks up a refresh session by token digest with its user relation', async () => {
    const session = {
      id: 'session-1',
      familyId: 'family-1',
      userId: 'user-1',
      expiresAt: new Date('2026-05-18T12:00:00.000Z'),
      revokedAt: null,
      replacedBySessionId: null,
      user: {
        id: 'user-1',
        email: 'admin@mecanismos.test',
        name: 'Admin',
        role: 'ADMIN',
        isActive: true,
      },
    };
    const prisma = {
      session: {
        findUnique: jest.fn().mockResolvedValue(session),
      },
    };

    const repository = new AuthSessionRepository(prisma as never);

    await expect(
      repository.findRefreshSessionByTokenDigest('digest-1'),
    ).resolves.toEqual(session);

    expect(prisma.session.findUnique).toHaveBeenCalledWith({
      where: {
        tokenDigest: 'digest-1',
      },
      include: {
        user: true,
      },
    });
  });
});
