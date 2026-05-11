import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import type { ChangePasswordDto } from './dto/change-password.dto';
import type { AuthRuntimeConfig } from './config/auth.config';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('AuthService', () => {
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
    touchUserLastLoginAt: jest.Mock;
  };
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
      touchUserLastLoginAt: jest.fn(),
    };

    jwtService = {
      signAsync: jest.fn().mockResolvedValue('signed-access-token'),
    };

    service = new AuthService(
      repository as never,
      jwtService as unknown as JwtService,
      authConfig,
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
      { sub: 'user-1', role: 'ADMIN' },
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
      } as ChangePasswordDto),
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
      }),
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
      } as ChangePasswordDto),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(repository.updatePasswordCredential).not.toHaveBeenCalled();
  });
});
