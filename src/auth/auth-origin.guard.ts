import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  AUTH_RUNTIME_CONFIG,
  isAllowedAuthRequestSource,
} from './config/auth.config';
import type { AuthRuntimeConfig } from './config/auth.config';

@Injectable()
export class AuthOriginGuard implements CanActivate {
  constructor(
    @Inject(AUTH_RUNTIME_CONFIG)
    private readonly authConfig: AuthRuntimeConfig,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    const isAllowed = isAllowedAuthRequestSource(
      request.method,
      {
        origin: request.get('origin') ?? undefined,
        referer: request.get('referer') ?? undefined,
      },
      this.authConfig.allowedOrigins,
    );

    if (!isAllowed) {
      throw new ForbiddenException('Unsafe auth request origin is not allowed');
    }

    return true;
  }
}
