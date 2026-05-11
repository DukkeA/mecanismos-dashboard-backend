import { RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { MODULE_METADATA } from '@nestjs/common/constants';
jest.mock('../prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { UserRole } from '../../generated/prisma/enums';
import { AppModule } from '../app.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ROLES_KEY } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersModule } from './admin-users.module';
import { AdminUsersService } from './admin-users.service';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { ListAdminUsersQueryDto } from './dto/list-admin-users-query.dto';
import { ResetAdminUserPasswordDto } from './dto/reset-admin-user-password.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';

describe('AdminUsersController', () => {
  const service = {
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    resetPassword: jest.fn(),
  } as unknown as jest.Mocked<AdminUsersService>;

  let controller: AdminUsersController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AdminUsersController(service);
  });

  it('registers ADMIN-only user-management routes and delegates DTO-driven payloads', async () => {
    const queryDto = {} as ListAdminUsersQueryDto;
    const createDto = {} as CreateAdminUserDto;
    const updateDto = {} as UpdateAdminUserDto;
    const resetDto = {} as ResetAdminUserPasswordDto;
    const currentUser = { sub: 'admin-1', role: UserRole.ADMIN };

    service.findAll.mockResolvedValue({ data: [], meta: {} } as never);
    service.create.mockResolvedValue({ id: 'user-1' } as never);
    service.update.mockResolvedValue({ id: 'user-1' } as never);
    service.resetPassword.mockResolvedValue({ id: 'user-1' } as never);

    await expect(controller.findAll(queryDto)).resolves.toEqual({
      data: [],
      meta: {},
    });
    await expect(controller.create(currentUser, createDto)).resolves.toEqual({
      id: 'user-1',
    });
    await expect(
      controller.update(currentUser, 'user-1', updateDto),
    ).resolves.toEqual({ id: 'user-1' });
    await expect(
      controller.resetPassword(currentUser, 'user-1', resetDto),
    ).resolves.toEqual({ id: 'user-1' });

    expect(Reflect.getMetadata(PATH_METADATA, AdminUsersController)).toBe(
      'admin/users',
    );
    expect(Reflect.getMetadata(ROLES_KEY, AdminUsersController)).toEqual([
      'ADMIN',
    ]);
    expect(Reflect.getMetadata(GUARDS_METADATA, AdminUsersController)).toEqual([
      JwtAuthGuard,
      RolesGuard,
    ]);

    const findAllHandler = Object.getOwnPropertyDescriptor(
      AdminUsersController.prototype,
      'findAll',
    )?.value as object;
    const createHandler = Object.getOwnPropertyDescriptor(
      AdminUsersController.prototype,
      'create',
    )?.value as object;
    const updateHandler = Object.getOwnPropertyDescriptor(
      AdminUsersController.prototype,
      'update',
    )?.value as object;
    const resetHandler = Object.getOwnPropertyDescriptor(
      AdminUsersController.prototype,
      'resetPassword',
    )?.value as object;

    expect(Reflect.getMetadata(METHOD_METADATA, findAllHandler)).toBe(
      RequestMethod.GET,
    );
    expect(Reflect.getMetadata(PATH_METADATA, createHandler)).toBe('/');
    expect(Reflect.getMetadata(METHOD_METADATA, createHandler)).toBe(
      RequestMethod.POST,
    );
    expect(Reflect.getMetadata(PATH_METADATA, updateHandler)).toBe(':id');
    expect(Reflect.getMetadata(METHOD_METADATA, updateHandler)).toBe(
      RequestMethod.PATCH,
    );
    expect(Reflect.getMetadata(PATH_METADATA, resetHandler)).toBe(
      ':id/reset-password',
    );
    expect(Reflect.getMetadata(METHOD_METADATA, resetHandler)).toBe(
      RequestMethod.POST,
    );

    expect(service.create.mock.calls[0]).toEqual(['admin-1', createDto]);
    expect(service.update.mock.calls[0]).toEqual([
      'admin-1',
      'user-1',
      updateDto,
    ]);
    expect(service.resetPassword.mock.calls[0]).toEqual([
      'admin-1',
      'user-1',
      resetDto,
    ]);

    const appModuleImports = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      AppModule,
    ) as unknown[];

    expect(appModuleImports).toContain(AdminUsersModule);
  });
});
