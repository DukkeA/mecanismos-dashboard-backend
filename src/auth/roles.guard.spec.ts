import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let reflector: { getAllAndOverride: jest.Mock };
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    };

    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  function createContext(role?: 'ADMIN' | 'SALES' | 'MECHANIC') {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          user: role ? { sub: 'user-1', role } : undefined,
        }),
      }),
    } as unknown as ExecutionContext;
  }

  it('allows SALES users when the route accepts ADMIN and SALES', () => {
    reflector.getAllAndOverride.mockReturnValue(['ADMIN', 'SALES']);

    const canActivate = guard.canActivate(createContext('SALES'));

    expect(canActivate).toBe(true);
  });

  it('describes all allowed roles in the forbidden message for multi-role routes', () => {
    reflector.getAllAndOverride.mockReturnValue(['ADMIN', 'SALES']);

    expect(() => guard.canActivate(createContext('MECHANIC'))).toThrow(
      new ForbiddenException('Allowed roles: ADMIN | SALES'),
    );
  });

  it('keeps single-role routes explicit in the forbidden message', () => {
    reflector.getAllAndOverride.mockReturnValue(['ADMIN']);

    expect(() => guard.canActivate(createContext('SALES'))).toThrow(
      new ForbiddenException('Allowed roles: ADMIN'),
    );
  });
});
