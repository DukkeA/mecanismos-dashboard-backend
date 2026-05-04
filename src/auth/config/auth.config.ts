import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { CookieOptions } from 'express';

export const AUTH_ENV_SOURCE_FILE = '.env';

type SameSitePolicy = 'lax' | 'strict' | 'none';

type CookieDefinition = {
  name: string;
  path: string;
};

export type AuthRuntimeConfig = {
  accessTokenSecret: string;
  refreshTokenSecret: string;
  accessTokenTtlSeconds: number;
  refreshTokenTtlSeconds: number;
  cookieSecure: boolean;
  cookieSameSite: SameSitePolicy;
  cookieDomain?: string;
  allowedOrigins: string[];
  envSourceFile: typeof AUTH_ENV_SOURCE_FILE;
  accessTokenCookie: CookieDefinition;
  refreshTokenCookie: CookieDefinition;
};

const DEFAULT_ACCESS_TOKEN_TTL_SECONDS = 60 * 15;
const DEFAULT_REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 14;
const DEFAULT_ACCESS_COOKIE_NAME = 'md_access';
const DEFAULT_REFRESH_COOKIE_NAME = 'md_refresh';
const DEFAULT_ACCESS_COOKIE_PATH = '/';
const DEFAULT_REFRESH_COOKIE_PATH = '/auth/refresh';

export function authConfigFromEnv(
  env: Record<string, string | undefined>,
): AuthRuntimeConfig {
  const missingVariables = [
    'AUTH_ACCESS_TOKEN_SECRET',
    'AUTH_REFRESH_TOKEN_SECRET',
  ].filter((variableName) => !env[variableName]?.trim());

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing required auth environment variables: ${missingVariables.join(', ')}`,
    );
  }

  const allowedOrigins = splitCommaSeparatedValues(env.AUTH_ALLOWED_ORIGINS);

  if (allowedOrigins.length === 0) {
    throw new Error(
      'Missing required auth environment variable: AUTH_ALLOWED_ORIGINS',
    );
  }

  return {
    accessTokenSecret: env.AUTH_ACCESS_TOKEN_SECRET!.trim(),
    refreshTokenSecret: env.AUTH_REFRESH_TOKEN_SECRET!.trim(),
    accessTokenTtlSeconds: parsePositiveInt(
      env.AUTH_ACCESS_TOKEN_TTL_SECONDS,
      DEFAULT_ACCESS_TOKEN_TTL_SECONDS,
      'AUTH_ACCESS_TOKEN_TTL_SECONDS',
    ),
    refreshTokenTtlSeconds: parsePositiveInt(
      env.AUTH_REFRESH_TOKEN_TTL_SECONDS,
      DEFAULT_REFRESH_TOKEN_TTL_SECONDS,
      'AUTH_REFRESH_TOKEN_TTL_SECONDS',
    ),
    cookieSecure: parseBoolean(env.AUTH_COOKIE_SECURE, false),
    cookieSameSite: parseSameSite(env.AUTH_COOKIE_SAME_SITE),
    cookieDomain: env.AUTH_COOKIE_DOMAIN?.trim() || undefined,
    allowedOrigins,
    envSourceFile: AUTH_ENV_SOURCE_FILE,
    accessTokenCookie: {
      name: env.AUTH_COOKIE_ACCESS_NAME?.trim() || DEFAULT_ACCESS_COOKIE_NAME,
      path: env.AUTH_COOKIE_ACCESS_PATH?.trim() || DEFAULT_ACCESS_COOKIE_PATH,
    },
    refreshTokenCookie: {
      name: env.AUTH_COOKIE_REFRESH_NAME?.trim() || DEFAULT_REFRESH_COOKIE_NAME,
      path: env.AUTH_COOKIE_REFRESH_PATH?.trim() || DEFAULT_REFRESH_COOKIE_PATH,
    },
  };
}

export function validateEnvironment(
  env: Record<string, string | undefined>,
): Record<string, string | undefined> {
  if (hasAnyAuthEnvironmentValue(env)) {
    authConfigFromEnv(env);
  }

  return env;
}

export function resolveOptionalAuthConfig(
  env: Record<string, string | undefined>,
): AuthRuntimeConfig | null {
  return hasAnyAuthEnvironmentValue(env) ? authConfigFromEnv(env) : null;
}

export function buildAuthCookieOptions(config: AuthRuntimeConfig): {
  accessToken: CookieOptions;
  refreshToken: CookieOptions;
} {
  const commonOptions: CookieOptions = {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: config.cookieSameSite,
    domain: config.cookieDomain,
  };

  return {
    accessToken: {
      ...commonOptions,
      path: config.accessTokenCookie.path,
    },
    refreshToken: {
      ...commonOptions,
      path: config.refreshTokenCookie.path,
    },
  };
}

export function buildAuthCorsOptions(config: AuthRuntimeConfig): CorsOptions {
  return {
    origin: config.allowedOrigins,
    credentials: true,
  };
}

function hasAnyAuthEnvironmentValue(
  env: Record<string, string | undefined>,
): boolean {
  return Object.keys(env).some((key) => key.startsWith('AUTH_'));
}

function splitCommaSeparatedValues(value: string | undefined): string[] {
  return (
    value
      ?.split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0) ?? []
  );
}

function parsePositiveInt(
  rawValue: string | undefined,
  defaultValue: number,
  variableName: string,
): number {
  if (!rawValue?.trim()) {
    return defaultValue;
  }

  const parsedValue = Number.parseInt(rawValue, 10);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`${variableName} must be a positive integer`);
  }

  return parsedValue;
}

function parseBoolean(
  rawValue: string | undefined,
  defaultValue: boolean,
): boolean {
  if (!rawValue?.trim()) {
    return defaultValue;
  }

  return rawValue.trim().toLowerCase() === 'true';
}

function parseSameSite(rawValue: string | undefined): SameSitePolicy {
  const normalizedValue = rawValue?.trim().toLowerCase();

  if (!normalizedValue) {
    return 'lax';
  }

  if (
    normalizedValue === 'lax' ||
    normalizedValue === 'strict' ||
    normalizedValue === 'none'
  ) {
    return normalizedValue;
  }

  throw new Error('AUTH_COOKIE_SAME_SITE must be one of: lax, strict, none');
}
