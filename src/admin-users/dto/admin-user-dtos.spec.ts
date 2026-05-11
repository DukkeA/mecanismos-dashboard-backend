import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UserRole } from '../../../generated/prisma/enums';
import { CreateAdminUserDto } from './create-admin-user.dto';
import { ListAdminUsersQueryDto } from './list-admin-users-query.dto';
import { ResetAdminUserPasswordDto } from './reset-admin-user-password.dto';
import { UpdateAdminUserDto } from './update-admin-user.dto';

describe('admin-user DTO contracts', () => {
  it('normalizes create payload fields and rejects invalid role/email/password shapes', async () => {
    const validDto = plainToInstance(CreateAdminUserDto, {
      email: '  NUEVO@MECANISMOS.TEST  ',
      name: '  Nuevo Usuario  ',
      role: UserRole.MECHANIC,
      temporaryPassword: '  Temp1234!  ',
    });
    const invalidDto = plainToInstance(CreateAdminUserDto, {
      email: 'correo-invalido',
      name: '   ',
      role: 'OWNER',
      temporaryPassword: '123',
    });

    expect(validDto.email).toBe('nuevo@mecanismos.test');
    expect(validDto.name).toBe('Nuevo Usuario');
    expect(validDto.temporaryPassword).toBe('Temp1234!');
    await expect(validate(validDto)).resolves.toHaveLength(0);

    const errors = await validate(invalidDto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['email', 'name', 'role', 'temporaryPassword']),
    );
  });

  it('parses list query filters with defaults and trims search', async () => {
    const defaultsDto = plainToInstance(ListAdminUsersQueryDto, {});
    const filteredDto = plainToInstance(ListAdminUsersQueryDto, {
      page: '2',
      limit: '5',
      search: '  admin  ',
      role: UserRole.ADMIN,
      isActive: 'FALSE',
    });

    expect(defaultsDto.page).toBe(1);
    expect(defaultsDto.limit).toBe(10);
    expect(filteredDto.search).toBe('admin');
    expect(filteredDto.isActive).toBe(false);
    await expect(validate(filteredDto)).resolves.toHaveLength(0);
  });

  it('keeps update partial while validating optional role and active flags', async () => {
    const validDto = plainToInstance(UpdateAdminUserDto, {
      name: '  Ventas Senior  ',
      role: UserRole.SALES,
      isActive: true,
    });
    const invalidDto = plainToInstance(UpdateAdminUserDto, {
      role: 'OWNER',
      isActive: 'later',
    });

    expect(validDto.name).toBe('Ventas Senior');
    await expect(validate(validDto)).resolves.toHaveLength(0);

    const errors = await validate(invalidDto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['role', 'isActive']),
    );
  });

  it('validates reset-password temporary passwords', async () => {
    const validDto = plainToInstance(ResetAdminUserPasswordDto, {
      temporaryPassword: '  Reset1234!  ',
    });
    const invalidDto = plainToInstance(ResetAdminUserPasswordDto, {
      temporaryPassword: '123',
    });

    expect(validDto.temporaryPassword).toBe('Reset1234!');
    await expect(validate(validDto)).resolves.toHaveLength(0);

    const errors = await validate(invalidDto);

    expect(errors).toHaveLength(1);
    expect(errors[0]?.property).toBe('temporaryPassword');
  });
});
