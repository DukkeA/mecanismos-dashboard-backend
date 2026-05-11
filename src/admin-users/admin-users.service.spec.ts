import {
  BadRequestException,
  ConflictException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserRole } from '../../generated/prisma/enums';
import { AdminUsersService } from './admin-users.service';
import { AdminUserEmailConflictError } from './persistence/admin-users.repository';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

describe('AdminUsersService', () => {
  const existingUser = {
    id: 'user-2',
    email: 'ventas@mecanismos.test',
    name: 'Ventas',
    role: UserRole.SALES,
    isActive: true,
    mustChangePassword: false,
    lastLoginAt: null,
    createdAt: new Date('2026-05-11T08:00:00.000Z'),
    updatedAt: new Date('2026-05-11T09:00:00.000Z'),
  };

  const repository = {
    findMany: jest.fn(),
    findById: jest.fn(),
    findByEmail: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updatePassword: jest.fn(),
    revokeRefreshSessionsForUser: jest.fn(),
  };

  let service: AdminUsersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AdminUsersService(repository as never);
  });

  it('creates an admin-managed user with a hashed temporary password and one-time response secret', async () => {
    repository.findByEmail.mockResolvedValue(null);
    repository.create.mockResolvedValue({
      ...existingUser,
      id: 'user-3',
      email: 'nuevo@mecanismos.test',
      name: 'Nuevo Usuario',
      role: UserRole.MECHANIC,
      mustChangePassword: true,
    });
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();

    await expect(
      service.create('admin-1', {
        email: '  NUEVO@MECANISMOS.TEST  ',
        name: '  Nuevo Usuario  ',
        role: UserRole.MECHANIC,
        temporaryPassword: 'Temp1234!',
      }),
    ).resolves.toMatchObject({
      id: 'user-3',
      email: 'nuevo@mecanismos.test',
      mustChangePassword: true,
      temporaryPassword: 'Temp1234!',
    });

    expect(bcrypt.hash).toHaveBeenCalledWith('Temp1234!', 12);
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'nuevo@mecanismos.test',
        mustChangePassword: true,
        passwordHash: 'hashed-password',
      }),
    );
    expect(JSON.stringify(logSpy.mock.calls)).not.toContain('Temp1234!');
  });

  it('rejects duplicate email creation even when casing differs', async () => {
    repository.findByEmail.mockResolvedValue(existingUser);

    await expect(
      service.create('admin-1', {
        email: 'VENTAS@MECANISMOS.TEST',
        name: 'Duplicado',
        role: UserRole.SALES,
        temporaryPassword: 'Temp1234!',
      }),
    ).rejects.toThrow(new ConflictException('User email already exists'));
  });

  it('updates another user role and name', async () => {
    repository.findById.mockResolvedValue(existingUser);
    repository.update.mockResolvedValue({
      ...existingUser,
      name: 'Ventas Senior',
      role: UserRole.ADMIN,
    });

    await expect(
      service.update('admin-1', 'user-2', {
        name: '  Ventas Senior  ',
        role: UserRole.ADMIN,
      }),
    ).resolves.toMatchObject({
      id: 'user-2',
      name: 'Ventas Senior',
      role: UserRole.ADMIN,
    });
  });

  it('rejects self-deactivation to prevent admin lockout', async () => {
    repository.findById.mockResolvedValue({
      ...existingUser,
      id: 'admin-1',
      role: UserRole.ADMIN,
    });

    await expect(
      service.update('admin-1', 'admin-1', { isActive: false }),
    ).rejects.toThrow(
      new BadRequestException('Admins cannot deactivate themselves'),
    );
  });

  it('rejects self-role downgrade to prevent admin lockout', async () => {
    repository.findById.mockResolvedValue({
      ...existingUser,
      id: 'admin-1',
      role: UserRole.ADMIN,
    });

    await expect(
      service.update('admin-1', 'admin-1', { role: UserRole.SALES }),
    ).rejects.toThrow(
      new BadRequestException('Admins cannot remove their own ADMIN role'),
    );
  });

  it('revokes refresh sessions when an admin deactivates a user', async () => {
    repository.findById.mockResolvedValue(existingUser);
    repository.update.mockResolvedValue({
      ...existingUser,
      isActive: false,
    });

    await expect(
      service.update('admin-1', 'user-2', { isActive: false }),
    ).resolves.toMatchObject({
      id: 'user-2',
      isActive: false,
    });

    expect(repository.revokeRefreshSessionsForUser).toHaveBeenCalledWith(
      'user-2',
      expect.any(Date),
    );
  });

  it('resets a password with bcrypt and revokes refresh sessions', async () => {
    repository.findById.mockResolvedValue(existingUser);
    repository.updatePassword.mockResolvedValue({
      ...existingUser,
      mustChangePassword: true,
    });
    (bcrypt.hash as jest.Mock).mockResolvedValue('reset-hash');

    await expect(
      service.resetPassword('admin-1', 'user-2', {
        temporaryPassword: 'Reset1234!',
      }),
    ).resolves.toMatchObject({
      id: 'user-2',
      mustChangePassword: true,
      temporaryPassword: 'Reset1234!',
    });

    expect(repository.updatePassword).toHaveBeenCalledWith(
      'user-2',
      expect.objectContaining({
        passwordHash: 'reset-hash',
        mustChangePassword: true,
      }),
    );
    expect(repository.revokeRefreshSessionsForUser).toHaveBeenCalledWith(
      'user-2',
      expect.any(Date),
    );
  });

  it('throws NotFoundException when updating a missing user', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(
      service.update('admin-1', 'missing-user', { name: 'Nada' }),
    ).rejects.toThrow(new NotFoundException('User missing-user not found'));
  });

  it('translates repository email conflicts into HTTP conflicts', async () => {
    repository.findByEmail.mockResolvedValue(null);
    repository.create.mockRejectedValue(new AdminUserEmailConflictError());
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

    await expect(
      service.create('admin-1', {
        email: 'nuevo@mecanismos.test',
        name: 'Nuevo',
        role: UserRole.SALES,
        temporaryPassword: 'Temp1234!',
      }),
    ).rejects.toThrow(new ConflictException('User email already exists'));
  });
});
