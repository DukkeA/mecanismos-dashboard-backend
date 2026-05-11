import { RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';

describe('AuthController', () => {
  const authConfig = {
    refreshTokenCookie: { name: 'md_refresh', path: '/auth/refresh' },
  };
  const service = {
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    getCurrentUser: jest.fn(),
    changePassword: jest.fn(),
  } as unknown as jest.Mocked<AuthService>;

  let controller: AuthController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AuthController(service, authConfig as never);
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
    expect(Reflect.getMetadata(GUARDS_METADATA, changePasswordHandler)).toEqual([
      JwtAuthGuard,
    ]);
    expect(service.changePassword).toHaveBeenCalledWith('user-1', dto);
  });
});
