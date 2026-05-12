import { RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthController } from './auth.controller';
import { AuthOriginGuard } from './auth-origin.guard';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RecoveryPhraseGenerator } from './recovery-phrase.generator';

const recoveryPhrase = new RecoveryPhraseGenerator({
  randomInt: (max) => Math.min(1, max - 1),
}).generate();
const recoveryPhraseWords = recoveryPhrase.split(' ');

describe('AuthController', () => {
  const authConfig = {
    cookieSecure: false,
    cookieSameSite: 'lax',
    accessTokenCookie: { name: 'md_access', path: '/' },
    refreshTokenCookie: { name: 'md_refresh', path: '/auth/refresh' },
  };
  const service = {
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    getCurrentUser: jest.fn(),
    changePassword: jest.fn(),
    getRecoveryPhraseStatus: jest.fn(),
    generateRecoveryPhrase: jest.fn(),
    recoverWithPhrase: jest.fn(),
  } as unknown as jest.Mocked<AuthService>;

  let controller: AuthController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AuthController(service, authConfig as never);
  });

  it('logs in, issues auth cookies, and returns only the user payload', async () => {
    const response = { cookie: jest.fn() };
    const request = {
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('jest-agent'),
    };
    service.login.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: { id: 'user-1', email: 'admin@mecanismos.test' },
    } as never);

    await expect(
      controller.login(
        { email: 'admin@mecanismos.test', password: 'Current123!' },
        request as never,
        response as never,
      ),
    ).resolves.toEqual({ id: 'user-1', email: 'admin@mecanismos.test' });

    expect(service.login.mock.calls[0]).toEqual([
      { email: 'admin@mecanismos.test', password: 'Current123!' },
      { ipAddress: '127.0.0.1', userAgent: 'jest-agent' },
    ]);
    expect(response.cookie).toHaveBeenCalledWith(
      'md_access',
      'access-token',
      expect.objectContaining({ httpOnly: true, path: '/' }),
    );
    expect(response.cookie).toHaveBeenCalledWith(
      'md_refresh',
      'refresh-token',
      expect.objectContaining({ httpOnly: true, path: '/auth/refresh' }),
    );
  });

  it('refreshes from the configured cookie name and reissues auth cookies', async () => {
    const response = { cookie: jest.fn() };
    const request = {
      ip: '127.0.0.1',
      cookies: { md_refresh: 'presented-refresh-token' },
      get: jest.fn().mockReturnValue(undefined),
    };
    service.refresh.mockResolvedValue({
      accessToken: 'next-access-token',
      refreshToken: 'next-refresh-token',
      user: { id: 'user-1' },
    } as never);

    await expect(
      controller.refresh(request as never, response as never),
    ).resolves.toEqual({ id: 'user-1' });

    expect(service.refresh.mock.calls[0]).toEqual([
      'presented-refresh-token',
      { ipAddress: '127.0.0.1', userAgent: undefined },
    ]);
    expect(response.cookie).toHaveBeenCalledTimes(2);
  });

  it('logs out with the presented refresh token and clears auth cookies', async () => {
    const response = { clearCookie: jest.fn() };
    const request = { cookies: { md_refresh: 'presented-refresh-token' } };
    service.logout.mockResolvedValue(undefined);

    await expect(
      controller.logout(request as never, response as never),
    ).resolves.toEqual({ success: true });

    expect(service.logout.mock.calls[0]).toEqual(['presented-refresh-token']);
    expect(response.clearCookie).toHaveBeenCalledWith(
      'md_access',
      expect.objectContaining({ path: '/' }),
    );
    expect(response.clearCookie).toHaveBeenCalledWith(
      'md_refresh',
      expect.objectContaining({ path: '/auth/refresh' }),
    );
  });

  it('returns the current user through the service boundary', async () => {
    service.getCurrentUser.mockResolvedValue({ id: 'user-1' } as never);

    await expect(
      controller.me({ sub: 'user-1', role: 'ADMIN' }),
    ).resolves.toEqual({ id: 'user-1' });

    expect(service.getCurrentUser.mock.calls[0]).toEqual(['user-1']);
  });

  it('returns the authenticated admin smoke role without touching the service', () => {
    expect(controller.adminSmoke({ sub: 'user-1', role: 'ADMIN' })).toEqual({
      success: true,
      role: 'ADMIN',
    });
    expect(service.getCurrentUser.mock.calls).toHaveLength(0);
  });

  it('registers the authenticated change-password route and delegates the payload', async () => {
    const dto = {} as ChangePasswordDto;
    service.changePassword.mockResolvedValue({
      id: 'user-1',
      mustChangePassword: false,
    } as never);

    await expect(
      controller.changePassword({ sub: 'user-1', role: 'ADMIN' }, dto),
    ).resolves.toEqual({
      id: 'user-1',
      mustChangePassword: false,
    });

    const changePasswordHandler = Object.getOwnPropertyDescriptor(
      AuthController.prototype,
      'changePassword',
    )?.value as object;

    expect(Reflect.getMetadata(PATH_METADATA, changePasswordHandler)).toBe(
      'change-password',
    );
    expect(Reflect.getMetadata(METHOD_METADATA, changePasswordHandler)).toBe(
      RequestMethod.POST,
    );
    expect(Reflect.getMetadata(GUARDS_METADATA, changePasswordHandler)).toEqual(
      [JwtAuthGuard],
    );
    expect(service.changePassword.mock.calls[0]).toEqual(['user-1', dto]);
  });

  it('registers the authenticated recovery status route and returns metadata only', async () => {
    service.getRecoveryPhraseStatus.mockResolvedValue({
      enabled: true,
      generatedAt: '2026-05-12T12:00:00.000Z',
      consumedAt: null,
    });

    await expect(
      controller.getRecoveryPhraseStatus({ sub: 'user-1', role: 'ADMIN' }),
    ).resolves.toEqual({
      enabled: true,
      generatedAt: '2026-05-12T12:00:00.000Z',
      consumedAt: null,
    });

    const handler = Object.getOwnPropertyDescriptor(
      AuthController.prototype,
      'getRecoveryPhraseStatus',
    )?.value as object;

    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(
      'recovery-phrase/status',
    );
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(
      RequestMethod.GET,
    );
    expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([
      JwtAuthGuard,
    ]);
    expect(service.getRecoveryPhraseStatus.mock.calls[0]).toEqual(['user-1']);
  });

  it('registers the authenticated recovery generation route with origin protection', async () => {
    const dto = { currentPassword: 'Current123!' };
    service.generateRecoveryPhrase.mockResolvedValue({
      phrase: recoveryPhrase,
      words: recoveryPhraseWords,
      generatedAt: '2026-05-12T12:00:00.000Z',
    });

    await expect(
      controller.generateRecoveryPhrase({ sub: 'user-1', role: 'ADMIN' }, dto),
    ).resolves.toMatchObject({
      phrase: recoveryPhrase,
      generatedAt: '2026-05-12T12:00:00.000Z',
    });

    const handler = Object.getOwnPropertyDescriptor(
      AuthController.prototype,
      'generateRecoveryPhrase',
    )?.value as object;

    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(
      'recovery-phrase/generate',
    );
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(
      RequestMethod.POST,
    );
    expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([
      AuthOriginGuard,
      JwtAuthGuard,
    ]);
    expect(service.generateRecoveryPhrase.mock.calls[0]).toEqual([
      'user-1',
      dto,
    ]);
  });

  it('registers the public recovery route with origin protection and generic success', async () => {
    const dto = {
      email: 'admin@mecanismos.test',
      recoveryPhrase,
      newPassword: 'NewSecure123!',
    };
    const request = {
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('jest-agent'),
    };
    service.recoverWithPhrase.mockResolvedValue({ success: true } as never);

    await expect(
      controller.recoverWithPhrase(request as never, dto),
    ).resolves.toEqual({ success: true });

    const handler = Object.getOwnPropertyDescriptor(
      AuthController.prototype,
      'recoverWithPhrase',
    )?.value as object;

    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(
      'recovery-phrase/recover',
    );
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(
      RequestMethod.POST,
    );
    expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([
      AuthOriginGuard,
    ]);
    expect(service.recoverWithPhrase.mock.calls[0]).toEqual([
      dto,
      { ipAddress: '127.0.0.1', userAgent: 'jest-agent' },
    ]);
  });
});
