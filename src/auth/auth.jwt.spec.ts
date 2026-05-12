import type { Request } from 'express';
import { JwtStrategy, extractAccessTokenFromCookies } from './auth.jwt';

describe('extractAccessTokenFromCookies', () => {
  it('returns the access token from the configured cookie', () => {
    const request = {
      cookies: {
        md_access: 'signed-access-token',
      },
    } as unknown as Request;

    expect(extractAccessTokenFromCookies(request, 'md_access')).toBe(
      'signed-access-token',
    );
  });

  it('returns undefined when the configured access cookie is absent', () => {
    const request = {
      cookies: {
        md_refresh: 'refresh-token',
      },
    } as unknown as Request;

    expect(extractAccessTokenFromCookies(request, 'md_access')).toBeUndefined();
  });
});

describe('JwtStrategy', () => {
  it('returns the current user claims when the access token authVersion matches storage', async () => {
    const repository = {
      findActiveUserById: jest.fn().mockResolvedValue({
        id: 'user-1',
        role: 'SALES',
        authVersion: 4,
        isActive: true,
      }),
    };
    const strategy = new JwtStrategy(
      {
        accessTokenCookie: { name: 'md_access', path: '/' },
        accessTokenSecret: 'access-secret',
      } as never,
      repository as never,
    );

    await expect(
      strategy.validate({ sub: 'user-1', role: 'ADMIN', authVersion: 4 }),
    ).resolves.toEqual({ sub: 'user-1', role: 'SALES', authVersion: 4 });
  });

  it('rejects an access token issued before the current authVersion', async () => {
    const repository = {
      findActiveUserById: jest.fn().mockResolvedValue({
        id: 'user-1',
        role: 'ADMIN',
        authVersion: 5,
        isActive: true,
      }),
    };
    const strategy = new JwtStrategy(
      {
        accessTokenCookie: { name: 'md_access', path: '/' },
        accessTokenSecret: 'access-secret',
      } as never,
      repository as never,
    );

    await expect(
      strategy.validate({ sub: 'user-1', role: 'ADMIN', authVersion: 4 }),
    ).rejects.toThrow('Access token is no longer valid');
  });
});
