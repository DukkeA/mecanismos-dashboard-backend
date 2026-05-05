import { Response } from 'express';
import {
  AuthRuntimeConfig,
  buildAuthCookieOptions,
} from './config/auth.config';

type AuthCookieTokens = {
  accessToken: string;
  refreshToken: string;
};

export function setAuthCookies(
  response: Response,
  config: AuthRuntimeConfig,
  tokens: AuthCookieTokens,
) {
  const cookieOptions = buildAuthCookieOptions(config);

  response.cookie(
    config.accessTokenCookie.name,
    tokens.accessToken,
    cookieOptions.accessToken,
  );
  response.cookie(
    config.refreshTokenCookie.name,
    tokens.refreshToken,
    cookieOptions.refreshToken,
  );
}

export function clearAuthCookies(
  response: Response,
  config: AuthRuntimeConfig,
) {
  const cookieOptions = buildAuthCookieOptions(config);

  response.clearCookie(
    config.accessTokenCookie.name,
    cookieOptions.accessToken,
  );
  response.clearCookie(
    config.refreshTokenCookie.name,
    cookieOptions.refreshToken,
  );
}
