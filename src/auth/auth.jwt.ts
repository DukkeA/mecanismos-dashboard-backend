import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AUTH_RUNTIME_CONFIG } from './config/auth.config';
import type { AuthRuntimeConfig } from './config/auth.config';
import { AuthSessionRepository } from './persistence/auth-session.repository';

export type AuthJwtPayload = {
  sub: string;
  role: 'ADMIN' | 'SALES' | 'MECHANIC';
  authVersion?: number;
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
    private readonly authSessionRepository: AuthSessionRepository,
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

  async validate(payload: AuthJwtPayload): Promise<AuthJwtPayload> {
    const user = await this.authSessionRepository.findActiveUserById(
      payload.sub,
    );

    if (!user || user.authVersion !== payload.authVersion) {
      throw new UnauthorizedException('Access token is no longer valid');
    }

    return {
      sub: user.id,
      role: user.role,
      authVersion: user.authVersion,
    };
  }
}
