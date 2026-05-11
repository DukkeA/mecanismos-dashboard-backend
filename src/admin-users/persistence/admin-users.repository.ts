import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Prisma } from '../../../generated/prisma/client';
import type { UserRole } from '../../../generated/prisma/enums';

export const ADMIN_USERS_PRISMA_CLIENT = Symbol('ADMIN_USERS_PRISMA_CLIENT');

export type AdminUserRecord = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateAdminUserInput = {
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
  passwordHash: string;
  passwordUpdatedAt: Date;
};

export type UpdateAdminUserInput = {
  name?: string;
  role?: UserRole;
  isActive?: boolean;
};

export type UpdateAdminUserPasswordInput = {
  passwordHash: string;
  mustChangePassword: boolean;
  passwordUpdatedAt: Date;
};

export type ListAdminUsersQuery = {
  page: number;
  limit: number;
  search?: string;
  role?: UserRole;
  isActive?: boolean;
};

type AdminUserWhereInput = Prisma.userWhereInput;

type AdminUsersPrismaClient = {
  user: {
    findUnique(args: {
      where: { id?: string; email?: string };
      select: Record<string, true>;
    }): Promise<AdminUserRecord | null>;
    findMany(args: {
      where: AdminUserWhereInput;
      orderBy: Array<{ createdAt: 'desc' }>;
      skip: number;
      take: number;
      select: Record<string, true>;
    }): Promise<AdminUserRecord[]>;
    count(args: { where: AdminUserWhereInput }): Promise<number>;
    update(args: {
      where: { id: string };
      data: Record<string, unknown>;
      select: Record<string, true>;
    }): Promise<AdminUserRecord>;
  };
  session: {
    updateMany(args: {
      where: { userId: string; revokedAt: null };
      data: { revokedAt: Date; updatedAt: Date };
    }): Promise<{ count: number }>;
  };
  $transaction<T>(
    callback: (tx: AdminUsersPrismaTransaction) => Promise<T>,
  ): Promise<T>;
};

type AdminUsersPrismaTransaction = {
  user: {
    create(args: {
      data: Record<string, unknown>;
      select: Record<string, true>;
    }): Promise<AdminUserRecord>;
    update(args: {
      where: { id: string };
      data: Record<string, unknown>;
      select: Record<string, true>;
    }): Promise<AdminUserRecord>;
  };
  account: {
    create(args: { data: Record<string, unknown> }): Promise<unknown>;
    update(args: {
      where: { userId: string };
      data: Record<string, unknown>;
    }): Promise<unknown>;
  };
};

@Injectable()
export class AdminUserEmailConflictError extends Error {
  constructor() {
    super('User email already exists');
  }
}

@Injectable()
export class AdminUsersRepository {
  constructor(
    @Inject(ADMIN_USERS_PRISMA_CLIENT)
    private readonly prisma: AdminUsersPrismaClient,
  ) {}

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: adminUserSelect,
    });
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: normalizeEmail(email) },
      select: adminUserSelect,
    });
  }

  async findMany(query: ListAdminUsersQuery) {
    const where = buildAdminUsersWhere(query);
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: query.limit,
        select: adminUserSelect,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async create(input: CreateAdminUserInput) {
    const now = input.passwordUpdatedAt;

    try {
      return await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            id: `test-admin-user-${randomUUID()}`,
            email: normalizeEmail(input.email),
            name: input.name.trim(),
            role: input.role,
            isActive: input.isActive,
            mustChangePassword: input.mustChangePassword,
            updatedAt: now,
          },
          select: adminUserSelect,
        });

        await tx.account.create({
          data: {
            id: randomUUID(),
            userId: user.id,
            passwordHash: input.passwordHash,
            passwordUpdatedAt: input.passwordUpdatedAt,
            updatedAt: now,
          },
        });

        return user;
      });
    } catch (error) {
      throw mapAdminUserWriteError(error);
    }
  }

  async update(id: string, input: UpdateAdminUserInput) {
    return this.prisma.user.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.role !== undefined ? { role: input.role } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        updatedAt: new Date(),
      },
      select: adminUserSelect,
    });
  }

  async updatePassword(userId: string, input: UpdateAdminUserPasswordInput) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.account.update({
          where: { userId },
          data: {
            passwordHash: input.passwordHash,
            passwordUpdatedAt: input.passwordUpdatedAt,
            updatedAt: input.passwordUpdatedAt,
          },
        });

        return tx.user.update({
          where: { id: userId },
          data: {
            mustChangePassword: input.mustChangePassword,
            updatedAt: input.passwordUpdatedAt,
          },
          select: adminUserSelect,
        });
      });
    } catch (error) {
      throw mapAdminUserWriteError(error);
    }
  }

  async revokeRefreshSessionsForUser(userId: string, revokedAt: Date) {
    const result = await this.prisma.session.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt,
        updatedAt: revokedAt,
      },
    });

    return result.count;
  }
}

const adminUserSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  mustChangePassword: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

function buildAdminUsersWhere(query: ListAdminUsersQuery): AdminUserWhereInput {
  const search = query.search?.trim();

  return {
    ...(query.role !== undefined ? { role: query.role } : {}),
    ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    ...(search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function mapAdminUserWriteError(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  ) {
    return new AdminUserEmailConflictError();
  }

  return error;
}
