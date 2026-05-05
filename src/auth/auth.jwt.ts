import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AUTH_RUNTIME_CONFIG } from './config/auth.config';
import type { AuthRuntimeConfig } from './config/auth.config';

export type AuthJwtPayload = {
  sub: string;
  role: 'ADMIN' | 'SALES' | 'MECHANIC';
};

export function extractAccessTokenFromCookies(
  request: Request,
  cookieName: string,
): string | undefined {
  return request.cookies?.[cookieName] as string | undefined;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(AUTH_RUNTIME_CONFIG)
    authConfig: AuthRuntimeConfig,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) =>
          extractAccessTokenFromCookies(
            request,
            authConfig.accessTokenCookie.name,
          ) ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: authConfig.accessTokenSecret,
    });
  }

  validate(payload: AuthJwtPayload) {
    return payload;
  }
}
