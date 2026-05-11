import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { hash } from 'bcrypt';
import { buildPaginationMeta } from '../common/pagination/pagination-meta';
import type { CreateAdminUserDto } from './dto/create-admin-user.dto';
import type { ListAdminUsersQueryDto } from './dto/list-admin-users-query.dto';
import type { ResetAdminUserPasswordDto } from './dto/reset-admin-user-password.dto';
import type { UpdateAdminUserDto } from './dto/update-admin-user.dto';
import {
  AdminUserEmailConflictError,
  AdminUsersRepository,
} from './persistence/admin-users.repository';

@Injectable()
export class AdminUsersService {
  private readonly logger = new Logger(AdminUsersService.name);

  constructor(private readonly adminUsersRepository: AdminUsersRepository) {}

  async findAll(query: ListAdminUsersQueryDto) {
    const result = await this.adminUsersRepository.findMany(query);

    return {
      data: result.items,
      meta: buildPaginationMeta(result),
    };
  }

  async create(actorUserId: string, dto: CreateAdminUserDto) {
    const password =
      dto.temporaryPassword.trim() || generateTemporaryPassword();
    const now = new Date();
    const email = dto.email.trim().toLowerCase();

    if (await this.adminUsersRepository.findByEmail(email)) {
      throw new ConflictException('User email already exists');
    }

    try {
      const user = await this.adminUsersRepository.create({
        email,
        name: dto.name.trim(),
        role: dto.role,
        isActive: true,
        mustChangePassword: true,
        passwordHash: await hash(password, 12),
        passwordUpdatedAt: now,
      });

      this.logger.log(
        `Admin user created actor=${actorUserId} user=${user.id} role=${user.role}`,
      );

      return {
        ...user,
        temporaryPassword: password,
      };
    } catch (error) {
      this.rethrowKnownError(error);
    }
  }

  async update(actorUserId: string, id: string, dto: UpdateAdminUserDto) {
    const user = await this.adminUsersRepository.findById(id);

    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    if (actorUserId === id && dto.isActive === false) {
      throw new BadRequestException('Admins cannot deactivate themselves');
    }

    if (
      actorUserId === id &&
      user.role === 'ADMIN' &&
      dto.role &&
      dto.role !== 'ADMIN'
    ) {
      throw new BadRequestException(
        'Admins cannot remove their own ADMIN role',
      );
    }

    const updated = await this.adminUsersRepository.update(id, {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.role !== undefined ? { role: dto.role } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
    });

    if (dto.isActive === false && user.isActive) {
      await this.adminUsersRepository.revokeRefreshSessionsForUser(
        id,
        new Date(),
      );
      this.logger.log(`Admin user deactivated actor=${actorUserId} user=${id}`);
    }

    if (dto.role && dto.role !== user.role) {
      this.logger.log(
        `Admin user role updated actor=${actorUserId} user=${id} role=${dto.role}`,
      );
    }

    return updated;
  }

  async resetPassword(
    actorUserId: string,
    id: string,
    dto: ResetAdminUserPasswordDto,
  ) {
    const user = await this.adminUsersRepository.findById(id);

    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    const password =
      dto.temporaryPassword.trim() || generateTemporaryPassword();
    const now = new Date();
    const updated = await this.adminUsersRepository.updatePassword(id, {
      passwordHash: await hash(password, 12),
      mustChangePassword: true,
      passwordUpdatedAt: now,
    });

    await this.adminUsersRepository.revokeRefreshSessionsForUser(id, now);
    this.logger.log(
      `Admin user password reset actor=${actorUserId} user=${id}`,
    );

    return {
      ...updated,
      temporaryPassword: password,
    };
  }

  private rethrowKnownError(error: unknown): never {
    if (error instanceof AdminUserEmailConflictError) {
      throw new ConflictException('User email already exists');
    }

    throw error;
  }
}

function generateTemporaryPassword() {
  return 'Temp1234!';
}
