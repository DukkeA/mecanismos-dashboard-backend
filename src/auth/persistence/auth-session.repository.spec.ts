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

  it('looks up active password credentials by user id with nullable recovery phrase metadata', async () => {
    const account = {
      id: 'account-1',
      passwordHash: 'hashed-password',
      recoveryPhraseHash: 'hashed-recovery-phrase',
      recoveryPhraseGeneratedAt: new Date('2026-05-12T10:00:00.000Z'),
      recoveryPhraseConsumedAt: null,
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
      repository.findActiveRecoveryCredentialByUserId('user-1'),
    ).resolves.toEqual(account);

    expect(prisma.account.findFirst).toHaveBeenCalledWith({
      where: {
        user: {
          id: 'user-1',
          isActive: true,
        },
      },
      select: {
        id: true,
        passwordHash: true,
        recoveryPhraseHash: true,
        recoveryPhraseGeneratedAt: true,
        recoveryPhraseConsumedAt: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
            authVersion: true,
            mustChangePassword: true,
          },
        },
      },
    });
  });

  it('stores only recovery phrase hash and nullable metadata for an account', async () => {
    const generatedAt = new Date('2026-05-12T10:00:00.000Z');
    const prisma = {
      account: {
        update: jest.fn().mockResolvedValue({ id: 'account-1' }),
      },
    };

    const repository = new AuthSessionRepository(prisma as never);

    await repository.storeRecoveryPhraseHash('user-1', {
      recoveryPhraseHash: 'hashed-recovery-phrase',
      generatedAt,
    });

    expect(prisma.account.update).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      data: {
        recoveryPhraseHash: 'hashed-recovery-phrase',
        recoveryPhraseGeneratedAt: generatedAt,
        recoveryPhraseConsumedAt: null,
        updatedAt: generatedAt,
      },
    });
  });

  it('looks up active recovery credentials by normalized email without role filtering', async () => {
    const account = {
      id: 'account-1',
      passwordHash: 'hashed-password',
      recoveryPhraseHash: 'hashed-recovery-phrase',
      recoveryPhraseGeneratedAt: new Date('2026-05-12T10:00:00.000Z'),
      recoveryPhraseConsumedAt: null,
      user: {
        id: 'user-1',
        email: 'admin@mecanismos.test',
        name: 'Admin',
        role: 'ADMIN',
        isActive: true,
        mustChangePassword: false,
      },
    };
    const prisma = {
      account: {
        findFirst: jest.fn().mockResolvedValue(account),
      },
    };

    const repository = new AuthSessionRepository(prisma as never);

    await expect(
      repository.findActiveRecoveryCredentialByEmail(
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
      select: {
        id: true,
        passwordHash: true,
        recoveryPhraseHash: true,
        recoveryPhraseGeneratedAt: true,
        recoveryPhraseConsumedAt: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
            authVersion: true,
            mustChangePassword: true,
          },
        },
      },
    });
  });

  it('recovers password, consumes phrase, bumps auth version, and revokes refresh sessions in one transaction', async () => {
    const recoveredUser = {
      id: 'user-1',
      email: 'admin@mecanismos.test',
      name: 'Admin',
      role: 'ADMIN',
      isActive: true,
      mustChangePassword: false,
    };
    const tx = {
      account: {
        update: jest.fn().mockResolvedValue({ id: 'account-1' }),
      },
      user: {
        update: jest.fn().mockResolvedValue(recoveredUser),
      },
      session: {
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
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
    const recoveredAt = new Date('2026-05-12T12:00:00.000Z');

    await expect(
      repository.recoverPasswordWithPhrase('user-1', {
        passwordHash: 'new-password-hash',
        passwordUpdatedAt: recoveredAt,
        recoveryPhraseConsumedAt: recoveredAt,
        bumpAuthVersion: true,
      }),
    ).resolves.toEqual(recoveredUser);

    expect(tx.account.update).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      data: {
        passwordHash: 'new-password-hash',
        passwordUpdatedAt: recoveredAt,
        recoveryPhraseHash: null,
        recoveryPhraseConsumedAt: recoveredAt,
        updatedAt: recoveredAt,
      },
    });
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        mustChangePassword: false,
        authVersion: { increment: 1 },
        updatedAt: recoveredAt,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        authVersion: true,
        mustChangePassword: true,
      },
    });
    expect(tx.session.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', revokedAt: null },
      data: { revokedAt: recoveredAt, updatedAt: recoveredAt },
    });
  });

  it('updates a password credential, forced-change flag, and auth version together', async () => {
    const updatedUser = {
      id: 'user-1',
      email: 'admin@mecanismos.test',
      mustChangePassword: false,
    };
    const tx = {
      account: {
        update: jest.fn().mockResolvedValue({ id: 'account-1' }),
      },
      user: {
        update: jest.fn().mockResolvedValue(updatedUser),
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
    const passwordUpdatedAt = new Date('2026-05-12T13:00:00.000Z');

    await expect(
      repository.updatePasswordCredential('user-1', {
        passwordHash: 'next-password-hash',
        passwordUpdatedAt,
        mustChangePassword: false,
        bumpAuthVersion: true,
      }),
    ).resolves.toEqual(updatedUser);

    expect(tx.account.update).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      data: {
        passwordHash: 'next-password-hash',
        passwordUpdatedAt,
        updatedAt: passwordUpdatedAt,
      },
    });
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        mustChangePassword: false,
        authVersion: { increment: 1 },
        updatedAt: passwordUpdatedAt,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        authVersion: true,
        mustChangePassword: true,
      },
    });
  });

  it('selects active user authVersion for JWT validation', async () => {
    const user = {
      id: 'user-1',
      role: 'ADMIN',
      authVersion: 2,
      isActive: true,
    };
    const prisma = {
      user: { findFirst: jest.fn().mockResolvedValue(user) },
    };
    const repository = new AuthSessionRepository(prisma as never);

    await expect(repository.findActiveUserById('user-1')).resolves.toEqual(
      user,
    );

    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { id: 'user-1', isActive: true },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        authVersion: true,
        mustChangePassword: true,
      },
    });
  });

  it('requires transaction support for recovery password reset', async () => {
    const repository = new AuthSessionRepository({} as never);

    await expect(
      repository.recoverPasswordWithPhrase('user-1', {
        passwordHash: 'new-password-hash',
        passwordUpdatedAt: new Date('2026-05-12T12:00:00.000Z'),
        recoveryPhraseConsumedAt: new Date('2026-05-12T12:00:00.000Z'),
      }),
    ).rejects.toThrow(
      'Prisma transaction support is required for recovery password reset',
    );
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

  it('requires transaction support for refresh rotation', async () => {
    const repository = new AuthSessionRepository({} as never);

    await expect(
      repository.rotateRefreshSession({
        currentSessionId: 'session-1',
        newSessionId: 'session-2',
        userId: 'user-1',
        familyId: 'family-1',
        newTokenDigest: 'digest-2',
        expiresAt: new Date('2026-05-18T12:00:00.000Z'),
        rotatedAt: new Date('2026-05-04T12:00:00.000Z'),
        ipAddress: undefined,
        userAgent: undefined,
      }),
    ).rejects.toThrow(
      'Prisma transaction support is required for refresh rotation',
    );
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

  it('updates the user last-login timestamp after successful login', async () => {
    const prisma = {
      user: {
        update: jest.fn().mockResolvedValue({ id: 'user-1' }),
      },
    };
    const repository = new AuthSessionRepository(prisma as never);
    const lastLoginAt = new Date('2026-05-12T14:00:00.000Z');

    await expect(
      repository.touchUserLastLoginAt('user-1', lastLoginAt),
    ).resolves.toEqual({ id: 'user-1' });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { lastLoginAt },
    });
  });
});
