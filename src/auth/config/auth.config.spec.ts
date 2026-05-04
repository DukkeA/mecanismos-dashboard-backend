import {
  AUTH_ENV_SOURCE_FILE,
  authConfigFromEnv,
  buildAuthCookieOptions,
  buildAuthCorsOptions,
} from './auth.config';

describe('authConfigFromEnv', () => {
  const baseEnv = {
    AUTH_ACCESS_TOKEN_SECRET: 'access-secret-1234567890',
    AUTH_REFRESH_TOKEN_SECRET: 'refresh-secret-1234567890',
    AUTH_ALLOWED_ORIGINS: 'http://localhost:3000, http://localhost:5173',
  };

  it('rejects missing auth secrets before the module boots', () => {
    expect(() =>
      authConfigFromEnv({
        AUTH_ALLOWED_ORIGINS: 'http://localhost:3000',
      }),
    ).toThrow(
      'Missing required auth environment variables: AUTH_ACCESS_TOKEN_SECRET, AUTH_REFRESH_TOKEN_SECRET',
    );
  });

  it('parses auth defaults from the root env contract', () => {
    const config = authConfigFromEnv(baseEnv);

    expect(config.accessTokenTtlSeconds).toBe(900);
    expect(config.refreshTokenTtlSeconds).toBe(60 * 60 * 24 * 14);
    expect(config.allowedOrigins).toEqual([
      'http://localhost:3000',
      'http://localhost:5173',
    ]);
    expect(config.accessTokenCookie.name).toBe('md_access');
    expect(config.refreshTokenCookie.name).toBe('md_refresh');
    expect(config.envSourceFile).toBe(AUTH_ENV_SOURCE_FILE);
  });
});

describe('buildAuthCookieOptions', () => {
  it('uses HttpOnly cookie defaults for same-site local development', () => {
    const config = authConfigFromEnv({
      AUTH_ACCESS_TOKEN_SECRET: 'access-secret-1234567890',
      AUTH_REFRESH_TOKEN_SECRET: 'refresh-secret-1234567890',
      AUTH_ALLOWED_ORIGINS: 'http://localhost:3000',
    });

    const cookies = buildAuthCookieOptions(config);

    expect(cookies.accessToken).toMatchObject({
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
    });
    expect(cookies.refreshToken).toMatchObject({
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/auth/refresh',
    });
  });

  it('honors cross-site secure cookie settings when configured', () => {
    const config = authConfigFromEnv({
      AUTH_ACCESS_TOKEN_SECRET: 'access-secret-1234567890',
      AUTH_REFRESH_TOKEN_SECRET: 'refresh-secret-1234567890',
      AUTH_ALLOWED_ORIGINS: 'https://app.mecanismos-tecnicos.com',
      AUTH_COOKIE_SECURE: 'true',
      AUTH_COOKIE_SAME_SITE: 'none',
      AUTH_COOKIE_DOMAIN: '.mecanismos-tecnicos.com',
    });

    const cookies = buildAuthCookieOptions(config);

    expect(cookies.accessToken).toMatchObject({
      secure: true,
      sameSite: 'none',
      domain: '.mecanismos-tecnicos.com',
    });
    expect(cookies.refreshToken).toMatchObject({
      secure: true,
      sameSite: 'none',
      domain: '.mecanismos-tecnicos.com',
    });
  });
});

describe('buildAuthCorsOptions', () => {
  it('enables credentials and preserves the configured frontend origins', () => {
    const config = authConfigFromEnv({
      AUTH_ACCESS_TOKEN_SECRET: 'access-secret-1234567890',
      AUTH_REFRESH_TOKEN_SECRET: 'refresh-secret-1234567890',
      AUTH_ALLOWED_ORIGINS:
        'http://localhost:3000,https://app.mecanismos-tecnicos.com',
    });

    const corsOptions = buildAuthCorsOptions(config);

    expect(corsOptions.credentials).toBe(true);
    expect(corsOptions.origin).toEqual([
      'http://localhost:3000',
      'https://app.mecanismos-tecnicos.com',
    ]);
  });
});
