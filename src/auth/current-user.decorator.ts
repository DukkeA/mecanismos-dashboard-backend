import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthJwtPayload } from './auth.jwt';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthJwtPayload | undefined => {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthJwtPayload }>();

    return request.user;
  },
);
