import {
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import type { AuthRuntimeConfig } from './config/auth.config';
import { RecoveryPhraseGenerator } from './recovery-phrase.generator';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('AuthService', () => {
  const recoveryPhrase = new RecoveryPhraseGenerator({
    randomInt: (max) => Math.min(1, max - 1),
  }).generate();
  const recoveryPhraseWords = recoveryPhrase.split(' ');
  const authConfig: AuthRuntimeConfig = {
    accessTokenSecret: 'access-secret',
    refreshTokenSecret: 'refresh-secret',
    accessTokenTtlSeconds: 900,
    refreshTokenTtlSeconds: 1209600,
    cookieSecure: false,
    cookieSameSite: 'lax',
    allowedOrigins: ['http://localhost:5173'],
    envSourceFile: '.env',
    accessTokenCookie: { name: 'md_access', path: '/' },
    refreshTokenCookie: { name: 'md_refresh', path: '/auth/refresh' },
  };

  const now = new Date('2026-05-04T15:00:00.000Z');

  let repository: {
    findActivePasswordCredentialByEmail: jest.Mock;
    findActivePasswordCredentialByUserId: jest.Mock;
    findActiveUserById: jest.Mock;
    createRefreshSession: jest.Mock;
    findRefreshSessionByTokenDigest: jest.Mock;
    rotateRefreshSession: jest.Mock;
    revokeRefreshFamily: jest.Mock;
    revokeRefreshSession: jest.Mock;
    updatePasswordCredential: jest.Mock;
    findActiveRecoveryCredentialByUserId: jest.Mock;
    findActiveRecoveryCredentialByEmail: jest.Mock;
    storeRecoveryPhraseHash: jest.Mock;
    recoverPasswordWithPhrase: jest.Mock;
    touchUserLastLoginAt: jest.Mock;
  };
  let recoveryPhraseRateLimiter: {
    assertAllowed: jest.Mock;
    recordFailure: jest.Mock;
    recordSuccess: jest.Mock;
  };
  let recoveryPhraseGenerator: { generate: jest.Mock };
  let jwtService: { signAsync: jest.Mock };
  let service: AuthService;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(now);

    repository = {
      findActivePasswordCredentialByEmail: jest.fn(),
      findActivePasswordCredentialByUserId: jest.fn(),
      findActiveUserById: jest.fn(),
      createRefreshSession: jest.fn(),
      findRefreshSessionByTokenDigest: jest.fn(),
      rotateRefreshSession: jest.fn(),
      revokeRefreshFamily: jest.fn(),
      revokeRefreshSession: jest.fn(),
      updatePasswordCredential: jest.fn(),
      findActiveRecoveryCredentialByUserId: jest.fn(),
      findActiveRecoveryCredentialByEmail: jest.fn(),
      storeRecoveryPhraseHash: jest.fn(),
      recoverPasswordWithPhrase: jest.fn(),
      touchUserLastLoginAt: jest.fn(),
    };

    recoveryPhraseGenerator = {
      generate: jest.fn().mockReturnValue(recoveryPhrase),
    };

    recoveryPhraseRateLimiter = {
      assertAllowed: jest.fn(),
      recordFailure: jest.fn(),
      recordSuccess: jest.fn(),
    };

    jwtService = {
      signAsync: jest.fn().mockResolvedValue('signed-access-token'),
    };

    service = new AuthService(
      repository as never,
      jwtService as unknown as JwtService,
      authConfig,
      recoveryPhraseGenerator as never,
      recoveryPhraseRateLimiter as never,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('logs in with valid credentials, updates last login, and persists a refresh session', async () => {
    repository.findActivePasswordCredentialByEmail.mockResolvedValue({
      id: 'account-1',
      passwordHash: 'stored-hash',
      user: {
        id: 'user-1',
        email: 'admin@mecanismos.test',
        name: 'Admin User',
        role: 'ADMIN',
        mustChangePassword: true,
        authVersion: 7,
        isActive: true,
      },
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    repository.createRefreshSession.mockResolvedValue({
      id: 'session-1',
      familyId: 'family-1',
    });

    const result: Awaited<ReturnType<AuthService['login']>> =
      await service.login(
        {
          email: 'admin@mecanismos.test',
          password: 'correct-password',
        },
        {
          ipAddress: '127.0.0.1',
          userAgent: 'jest',
        },
      );

    expect(result.user).toEqual({
      id: 'user-1',
      email: 'admin@mecanismos.test',
      name: 'Admin User',
      role: 'ADMIN',
      mustChangePassword: true,
    });
    expect(result.accessToken).toBe('signed-access-token');
    expect(result.refreshToken).toEqual(expect.any(String));
    expect(repository.touchUserLastLoginAt).toHaveBeenCalledWith('user-1', now);
    const createRefreshSessionCall = repository.createRefreshSession.mock
      .calls[0] as [
      {
        userId: string;
        ipAddress?: string;
        userAgent?: string;
        expiresAt: Date;
        lastUsedAt: Date;
        tokenDigest: string;
      },
    ];
    const [createRefreshSessionInput] = createRefreshSessionCall;

    expect(createRefreshSessionInput).toBeDefined();
    expect(createRefreshSessionInput).toMatchObject({
      userId: 'user-1',
      ipAddress: '127.0.0.1',
      userAgent: 'jest',
      expiresAt: new Date('2026-05-18T15:00:00.000Z'),
      lastUsedAt: now,
    });
    expect(createRefreshSessionInput.tokenDigest).toEqual(expect.any(String));
    expect(jwtService.signAsync).toHaveBeenCalledWith(
      { sub: 'user-1', role: 'ADMIN', authVersion: 7 },
      {
        secret: 'access-secret',
        expiresIn: 900,
      },
    );
  });

  it('rejects invalid credentials without issuing any tokens', async () => {
    repository.findActivePasswordCredentialByEmail.mockResolvedValue({
      id: 'account-1',
      passwordHash: 'stored-hash',
      user: {
        id: 'user-1',
        email: 'admin@mecanismos.test',
        name: 'Admin User',
        role: 'ADMIN',
        mustChangePassword: false,
        authVersion: 3,
        isActive: true,
      },
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      service.login(
        {
          email: 'admin@mecanismos.test',
          password: 'wrong-password',
        },
        {
          ipAddress: '127.0.0.1',
          userAgent: 'jest',
        },
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(jwtService.signAsync).not.toHaveBeenCalled();
    expect(repository.createRefreshSession).not.toHaveBeenCalled();
  });

  it('rotates a valid refresh token and returns a replacement token pair', async () => {
    repository.findRefreshSessionByTokenDigest.mockResolvedValue({
      id: 'session-1',
      familyId: 'family-1',
      userId: 'user-1',
      expiresAt: new Date('2026-05-20T15:00:00.000Z'),
      revokedAt: null,
      replacedBySessionId: null,
      user: {
        id: 'user-1',
        email: 'admin@mecanismos.test',
        name: 'Admin User',
        role: 'ADMIN',
        mustChangePassword: false,
        isActive: true,
      },
    });
    repository.rotateRefreshSession.mockResolvedValue({
      revokedSessionId: 'session-1',
      replacementSession: {
        id: 'session-2',
        familyId: 'family-1',
      },
    });

    const result: Awaited<ReturnType<AuthService['refresh']>> =
      await service.refresh('refresh-token-1', {
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
      });

    expect(result.user).toEqual({
      id: 'user-1',
      email: 'admin@mecanismos.test',
      name: 'Admin User',
      role: 'ADMIN',
      mustChangePassword: false,
    });
    expect(result.accessToken).toBe('signed-access-token');
    expect(result.refreshToken).toEqual(expect.any(String));
    const rotateRefreshSessionCall = repository.rotateRefreshSession.mock
      .calls[0] as [
      {
        currentSessionId: string;
        userId: string;
        familyId: string;
        ipAddress?: string;
        userAgent?: string;
        rotatedAt: Date;
        expiresAt: Date;
        newTokenDigest: string;
      },
    ];
    const [rotateRefreshSessionInput] = rotateRefreshSessionCall;

    expect(rotateRefreshSessionInput).toBeDefined();
    expect(rotateRefreshSessionInput).toMatchObject({
      currentSessionId: 'session-1',
      userId: 'user-1',
      familyId: 'family-1',
      ipAddress: '127.0.0.1',
      userAgent: 'jest',
      rotatedAt: now,
      expiresAt: new Date('2026-05-18T15:00:00.000Z'),
    });
    expect(rotateRefreshSessionInput.newTokenDigest).toEqual(
      expect.any(String),
    );
  });

  it('revokes the entire refresh-token family when a rotated token is reused', async () => {
    repository.findRefreshSessionByTokenDigest.mockResolvedValue({
      id: 'session-1',
      familyId: 'family-1',
      userId: 'user-1',
      expiresAt: new Date('2026-05-20T15:00:00.000Z'),
      revokedAt: new Date('2026-05-04T14:59:00.000Z'),
      replacedBySessionId: 'session-2',
      user: {
        id: 'user-1',
        email: 'admin@mecanismos.test',
        name: 'Admin User',
        role: 'ADMIN',
        mustChangePassword: false,
        isActive: true,
      },
    });

    await expect(
      service.refresh('refresh-token-1', {
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(repository.revokeRefreshFamily).toHaveBeenCalledWith(
      'family-1',
      now,
    );
    expect(repository.rotateRefreshSession).not.toHaveBeenCalled();
  });

  it('revokes the current refresh session during logout when a refresh token is present', async () => {
    repository.findRefreshSessionByTokenDigest.mockResolvedValue({
      id: 'session-1',
      familyId: 'family-1',
      userId: 'user-1',
      expiresAt: new Date('2026-05-20T15:00:00.000Z'),
      revokedAt: null,
      replacedBySessionId: null,
      user: {
        id: 'user-1',
        email: 'admin@mecanismos.test',
        name: 'Admin User',
        role: 'ADMIN',
        mustChangePassword: false,
        isActive: true,
      },
    });

    await service.logout('refresh-token-1');

    expect(repository.revokeRefreshSession).toHaveBeenCalledWith(
      'session-1',
      now,
    );
  });

  it('treats logout without a refresh token as a no-op', async () => {
    await service.logout(undefined);

    expect(repository.findRefreshSessionByTokenDigest).not.toHaveBeenCalled();
    expect(repository.revokeRefreshSession).not.toHaveBeenCalled();
  });

  it('returns the active current user identity for /auth/me', async () => {
    repository.findActiveUserById.mockResolvedValue({
      id: 'user-1',
      email: 'admin@mecanismos.test',
      name: 'Admin User',
      role: 'ADMIN',
      mustChangePassword: true,
      isActive: true,
    });

    await expect(service.getCurrentUser('user-1')).resolves.toEqual({
      id: 'user-1',
      email: 'admin@mecanismos.test',
      name: 'Admin User',
      role: 'ADMIN',
      mustChangePassword: true,
    });
  });

  it('rejects /auth/me when the user is missing or inactive', async () => {
    repository.findActiveUserById.mockResolvedValue(null);

    await expect(service.getCurrentUser('missing-user')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('changes the current password, clears mustChangePassword, and persists the new hash', async () => {
    repository.findActivePasswordCredentialByUserId.mockResolvedValue({
      id: 'account-1',
      passwordHash: 'stored-hash',
      user: {
        id: 'user-1',
        email: 'admin@mecanismos.test',
        name: 'Admin User',
        role: 'ADMIN',
        mustChangePassword: true,
        isActive: true,
      },
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');
    repository.updatePasswordCredential.mockResolvedValue({
      id: 'user-1',
      email: 'admin@mecanismos.test',
      name: 'Admin User',
      role: 'ADMIN',
      mustChangePassword: false,
      isActive: true,
    });

    await expect(
      service.changePassword('user-1', {
        currentPassword: 'Temp1234!',
        newPassword: 'NewSecure123!',
      }),
    ).resolves.toEqual({
      id: 'user-1',
      email: 'admin@mecanismos.test',
      name: 'Admin User',
      role: 'ADMIN',
      mustChangePassword: false,
    });

    expect(repository.updatePasswordCredential).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        passwordHash: 'new-hash',
        mustChangePassword: false,
        bumpAuthVersion: true,
      }),
    );
  });

  it('requests an auth version bump when changing the current password', async () => {
    repository.findActivePasswordCredentialByUserId.mockResolvedValue({
      id: 'account-1',
      passwordHash: 'stored-hash',
      user: { id: 'user-1', role: 'ADMIN', isActive: true },
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');
    repository.updatePasswordCredential.mockResolvedValue({
      id: 'user-1',
      email: 'admin@mecanismos.test',
      name: 'Admin User',
      role: 'ADMIN',
      mustChangePassword: false,
      isActive: true,
    });

    await service.changePassword('user-1', {
      currentPassword: 'Temp1234!',
      newPassword: 'NewSecure123!',
    });

    expect(repository.updatePasswordCredential).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ bumpAuthVersion: true }),
    );
  });

  it('rejects change-password when the current password is wrong', async () => {
    repository.findActivePasswordCredentialByUserId.mockResolvedValue({
      id: 'account-1',
      passwordHash: 'stored-hash',
      user: {
        id: 'user-1',
        email: 'admin@mecanismos.test',
        name: 'Admin User',
        role: 'ADMIN',
        mustChangePassword: true,
        isActive: true,
      },
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      service.changePassword('user-1', {
        currentPassword: 'Wrong123!',
        newPassword: 'NewSecure123!',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(repository.updatePasswordCredential).not.toHaveBeenCalled();
  });

  it('returns recovery phrase status metadata without exposing the stored hash', async () => {
    repository.findActiveRecoveryCredentialByUserId.mockResolvedValue({
      id: 'account-1',
      passwordHash: 'stored-password-hash',
      recoveryPhraseHash: 'stored-recovery-hash',
      recoveryPhraseGeneratedAt: new Date('2026-05-12T12:00:00.000Z'),
      recoveryPhraseConsumedAt: null,
      user: {
        id: 'user-1',
        email: 'admin@mecanismos.test',
        name: 'Admin User',
        role: 'ADMIN',
        mustChangePassword: false,
        isActive: true,
      },
    });

    await expect(service.getRecoveryPhraseStatus('user-1')).resolves.toEqual({
      enabled: true,
      generatedAt: '2026-05-12T12:00:00.000Z',
      consumedAt: null,
    });
  });

  it('verifies current password, stores only a slow hash, and returns generated phrase once', async () => {
    repository.findActiveRecoveryCredentialByUserId.mockResolvedValue({
      id: 'account-1',
      passwordHash: 'stored-password-hash',
      recoveryPhraseHash: null,
      recoveryPhraseGeneratedAt: null,
      recoveryPhraseConsumedAt: null,
      user: {
        id: 'user-1',
        email: 'admin@mecanismos.test',
        name: 'Admin User',
        role: 'ADMIN',
        mustChangePassword: false,
        isActive: true,
      },
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (bcrypt.hash as jest.Mock).mockResolvedValue('recovery-phrase-hash');

    await expect(
      service.generateRecoveryPhrase('user-1', {
        currentPassword: 'Current123!',
      }),
    ).resolves.toEqual({
      phrase: recoveryPhrase,
      words: recoveryPhraseWords,
      generatedAt: now.toISOString(),
    });

    expect(bcrypt.compare).toHaveBeenCalledWith(
      'Current123!',
      'stored-password-hash',
    );
    expect(bcrypt.hash).toHaveBeenCalledWith(recoveryPhrase, 12);
    expect(repository.storeRecoveryPhraseHash).toHaveBeenCalledWith('user-1', {
      recoveryPhraseHash: 'recovery-phrase-hash',
      generatedAt: now,
    });
  });

  it('allows an active sales user to generate their own recovery phrase', async () => {
    repository.findActiveRecoveryCredentialByUserId.mockResolvedValue({
      id: 'account-1',
      passwordHash: 'stored-password-hash',
      recoveryPhraseHash: null,
      recoveryPhraseGeneratedAt: null,
      recoveryPhraseConsumedAt: null,
      user: {
        id: 'sales-1',
        email: 'sales@mecanismos.test',
        name: 'Sales User',
        role: 'SALES',
        mustChangePassword: false,
        isActive: true,
      },
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (bcrypt.hash as jest.Mock).mockResolvedValue('recovery-phrase-hash');

    await expect(
      service.generateRecoveryPhrase('sales-1', {
        currentPassword: 'Current123!',
      }),
    ).resolves.toMatchObject({
      phrase: recoveryPhrase,
      words: recoveryPhraseWords,
    });

    expect(repository.storeRecoveryPhraseHash).toHaveBeenCalledWith('sales-1', {
      recoveryPhraseHash: 'recovery-phrase-hash',
      generatedAt: now,
    });
  });

  it('rejects recovery phrase generation when current password is wrong', async () => {
    repository.findActiveRecoveryCredentialByUserId.mockResolvedValue({
      id: 'account-1',
      passwordHash: 'stored-password-hash',
      user: {
        id: 'user-1',
        email: 'admin@mecanismos.test',
        name: 'Admin User',
        role: 'ADMIN',
        mustChangePassword: false,
        isActive: true,
      },
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      service.generateRecoveryPhrase('user-1', {
        currentPassword: 'Wrong123!',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(recoveryPhraseGenerator.generate).not.toHaveBeenCalled();
    expect(repository.storeRecoveryPhraseHash).not.toHaveBeenCalled();
  });

  it('recovers an active user with matching phrase and revokes existing refresh sessions', async () => {
    repository.findActiveRecoveryCredentialByEmail.mockResolvedValue({
      id: 'account-1',
      passwordHash: 'old-password-hash',
      recoveryPhraseHash: 'stored-recovery-hash',
      recoveryPhraseGeneratedAt: new Date('2026-05-12T12:00:00.000Z'),
      recoveryPhraseConsumedAt: null,
      user: {
        id: 'user-1',
        email: 'admin@mecanismos.test',
        name: 'Admin User',
        role: 'ADMIN',
        mustChangePassword: true,
        isActive: true,
      },
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (bcrypt.hash as jest.Mock).mockResolvedValue('new-password-hash');
    repository.recoverPasswordWithPhrase.mockResolvedValue({
      id: 'user-1',
      email: 'admin@mecanismos.test',
      name: 'Admin User',
      role: 'ADMIN',
      mustChangePassword: false,
      isActive: true,
    });

    await expect(
      service.recoverWithPhrase(
        {
          email: 'admin@mecanismos.test',
          recoveryPhrase: recoveryPhrase.toUpperCase().replace(/ /g, '   '),
          newPassword: 'NewSecure123!',
        },
        { ipAddress: '127.0.0.1' },
      ),
    ).resolves.toEqual({ success: true });

    expect(bcrypt.compare).toHaveBeenCalledWith(
      recoveryPhrase,
      'stored-recovery-hash',
    );
    expect(repository.recoverPasswordWithPhrase).toHaveBeenCalledWith(
      'user-1',
      {
        passwordHash: 'new-password-hash',
        passwordUpdatedAt: now,
        recoveryPhraseConsumedAt: now,
        bumpAuthVersion: true,
      },
    );
    expect(recoveryPhraseRateLimiter.recordSuccess).toHaveBeenCalledWith({
      email: 'admin@mecanismos.test',
      ipAddress: '127.0.0.1',
    });
  });

  it('locks recovery attempts after limiter reports too many failures', async () => {
    recoveryPhraseRateLimiter.assertAllowed.mockImplementation(() => {
      throw new HttpException(
        'Too many recovery attempts',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    });

    await expect(
      service.recoverWithPhrase(
        {
          email: 'admin@mecanismos.test',
          recoveryPhrase,
          newPassword: 'NewSecure123!',
        },
        { ipAddress: '127.0.0.1' },
      ),
    ).rejects.toThrow(HttpException);

    expect(
      repository.findActiveRecoveryCredentialByEmail,
    ).not.toHaveBeenCalled();
    expect(recoveryPhraseRateLimiter.recordFailure).not.toHaveBeenCalled();
  });

  it('records recovery failures against the same generic email/ip key', async () => {
    repository.findActiveRecoveryCredentialByEmail.mockResolvedValue(null);

    await expect(
      service.recoverWithPhrase(
        {
          email: 'missing@mecanismos.test',
          recoveryPhrase,
          newPassword: 'NewSecure123!',
        },
        { ipAddress: '127.0.0.1' },
      ),
    ).rejects.toThrow(new UnauthorizedException('Recovery failed'));

    expect(recoveryPhraseRateLimiter.recordFailure).toHaveBeenCalledWith({
      email: 'missing@mecanismos.test',
      ipAddress: '127.0.0.1',
    });
  });

  it('recovers an active sales user with matching phrase', async () => {
    repository.findActiveRecoveryCredentialByEmail.mockResolvedValue({
      id: 'account-1',
      passwordHash: 'old-password-hash',
      recoveryPhraseHash: 'stored-recovery-hash',
      recoveryPhraseGeneratedAt: new Date('2026-05-12T12:00:00.000Z'),
      recoveryPhraseConsumedAt: null,
      user: {
        id: 'sales-1',
        email: 'sales@mecanismos.test',
        name: 'Sales User',
        role: 'SALES',
        mustChangePassword: true,
        isActive: true,
      },
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (bcrypt.hash as jest.Mock).mockResolvedValue('new-password-hash');

    await expect(
      service.recoverWithPhrase({
        email: 'sales@mecanismos.test',
        recoveryPhrase,
        newPassword: 'NewSecure123!',
      }),
    ).resolves.toEqual({ success: true });

    expect(repository.recoverPasswordWithPhrase).toHaveBeenCalledWith(
      'sales-1',
      {
        passwordHash: 'new-password-hash',
        passwordUpdatedAt: now,
        recoveryPhraseConsumedAt: now,
        bumpAuthVersion: true,
      },
    );
  });

  it('uses the same generic failure for missing user, wrong phrase, and used phrase', async () => {
    repository.findActiveRecoveryCredentialByEmail.mockResolvedValueOnce(null);

    await expect(
      service.recoverWithPhrase({
        email: 'missing@mecanismos.test',
        recoveryPhrase,
        newPassword: 'NewSecure123!',
      }),
    ).rejects.toThrow(new UnauthorizedException('Recovery failed'));

    repository.findActiveRecoveryCredentialByEmail.mockResolvedValueOnce({
      id: 'account-1',
      recoveryPhraseHash: 'stored-recovery-hash',
      recoveryPhraseConsumedAt: null,
      user: { id: 'user-1', role: 'ADMIN', isActive: true },
    });
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

    await expect(
      service.recoverWithPhrase({
        email: 'admin@mecanismos.test',
        recoveryPhrase,
        newPassword: 'NewSecure123!',
      }),
    ).rejects.toThrow(new UnauthorizedException('Recovery failed'));

    repository.findActiveRecoveryCredentialByEmail.mockResolvedValueOnce({
      id: 'account-1',
      recoveryPhraseHash: 'stored-recovery-hash',
      recoveryPhraseConsumedAt: now,
      user: { id: 'user-1', role: 'ADMIN', isActive: true },
    });

    await expect(
      service.recoverWithPhrase({
        email: 'admin@mecanismos.test',
        recoveryPhrase,
        newPassword: 'NewSecure123!',
      }),
    ).rejects.toThrow(new UnauthorizedException('Recovery failed'));

    expect(repository.recoverPasswordWithPhrase).not.toHaveBeenCalled();
  });
});
