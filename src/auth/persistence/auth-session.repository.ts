import { Inject, Injectable } from '@nestjs/common';

export const AUTH_PRISMA_CLIENT = Symbol('AUTH_PRISMA_CLIENT');

type CredentialAccountRecord = {
  id: string;
  passwordHash: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: 'ADMIN' | 'SALES' | 'MECHANIC';
    isActive: boolean;
  };
};

type RefreshSessionRecord = {
  id: string;
  familyId: string;
};

type RefreshSessionLookupRecord = {
  id: string;
  familyId: string;
  userId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedBySessionId: string | null;
  user: {
    id: string;
    email: string;
    name: string;
    role: 'ADMIN' | 'SALES' | 'MECHANIC';
    isActive: boolean;
  };
};

type ActiveUserRecord = {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'SALES' | 'MECHANIC';
  isActive: boolean;
};

type AuthPrismaClient = {
  account: {
    findFirst(args: {
      where: { user: { email: string; isActive: true } };
      include: { user: true };
    }): Promise<CredentialAccountRecord | null>;
  };
  session: {
    create(args: {
      data: {
        id: string;
        userId: string;
        familyId: string;
        tokenDigest: string;
        expiresAt: Date;
        lastUsedAt: Date;
        ipAddress?: string;
        userAgent?: string;
      };
    }): Promise<RefreshSessionRecord>;
    findUnique(args: {
      where: { tokenDigest: string };
      include: { user: true };
    }): Promise<RefreshSessionLookupRecord | null>;
    update(args: {
      where: { id: string };
      data: {
        revokedAt: Date;
        replacedBySessionId?: string;
        lastUsedAt?: Date;
      };
    }): Promise<unknown>;
    updateMany(args: {
      where: { familyId: string; revokedAt: null };
      data: { revokedAt: Date };
    }): Promise<{ count: number }>;
  };
  user: {
    findFirst(args: {
      where: { id: string; isActive: true };
      select: {
        id: true;
        email: true;
        name: true;
        role: true;
        isActive: true;
      };
    }): Promise<ActiveUserRecord | null>;
    update(args: {
      where: { id: string };
      data: { lastLoginAt: Date };
    }): Promise<unknown>;
  };
  $transaction?<T>(
    callback: (tx: AuthPrismaTransaction) => Promise<T>,
  ): Promise<T>;
};

type AuthPrismaTransaction = {
  session: {
    create(args: {
      data: {
        id: string;
        userId: string;
        familyId: string;
        tokenDigest: string;
        expiresAt: Date;
        lastUsedAt: Date;
        ipAddress?: string;
        userAgent?: string;
      };
    }): Promise<RefreshSessionRecord>;
    update(args: {
      where: { id: string };
      data: { revokedAt: Date; replacedBySessionId: string; lastUsedAt: Date };
    }): Promise<unknown>;
  };
};

type RotateRefreshSessionInput = {
  currentSessionId: string;
  newSessionId: string;
  userId: string;
  familyId: string;
  newTokenDigest: string;
  expiresAt: Date;
  rotatedAt: Date;
  ipAddress?: string;
  userAgent?: string;
};

type CreateRefreshSessionInput = {
  sessionId: string;
  userId: string;
  familyId: string;
  tokenDigest: string;
  expiresAt: Date;
  lastUsedAt: Date;
  ipAddress?: string;
  userAgent?: string;
};

@Injectable()
export class AuthSessionRepository {
  constructor(
    @Inject(AUTH_PRISMA_CLIENT)
    private readonly prisma: AuthPrismaClient,
  ) {}

  findActivePasswordCredentialByEmail(email: string) {
    return this.prisma.account.findFirst({
      where: {
        user: {
          email: email.trim().toLowerCase(),
          isActive: true,
        },
      },
      include: {
        user: true,
      },
    });
  }

  findActiveUserById(userId: string) {
    return this.prisma.user.findFirst({
      where: {
        id: userId,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    });
  }

  async rotateRefreshSession(input: RotateRefreshSessionInput) {
    if (!this.prisma.$transaction) {
      throw new Error(
        'Prisma transaction support is required for refresh rotation',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const replacementSession = await tx.session.create({
        data: {
          id: input.newSessionId,
          userId: input.userId,
          familyId: input.familyId,
          tokenDigest: input.newTokenDigest,
          expiresAt: input.expiresAt,
          lastUsedAt: input.rotatedAt,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
        },
      });

      await tx.session.update({
        where: { id: input.currentSessionId },
        data: {
          revokedAt: input.rotatedAt,
          replacedBySessionId: input.newSessionId,
          lastUsedAt: input.rotatedAt,
        },
      });

      return {
        revokedSessionId: input.currentSessionId,
        replacementSession,
      };
    });
  }

  createRefreshSession(input: CreateRefreshSessionInput) {
    return this.prisma.session.create({
      data: {
        id: input.sessionId,
        userId: input.userId,
        familyId: input.familyId,
        tokenDigest: input.tokenDigest,
        expiresAt: input.expiresAt,
        lastUsedAt: input.lastUsedAt,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });
  }

  findRefreshSessionByTokenDigest(tokenDigest: string) {
    return this.prisma.session.findUnique({
      where: {
        tokenDigest,
      },
      include: {
        user: true,
      },
    });
  }

  async revokeRefreshFamily(familyId: string, revokedAt: Date) {
    const result = await this.prisma.session.updateMany({
      where: {
        familyId,
        revokedAt: null,
      },
      data: {
        revokedAt,
      },
    });

    return result.count;
  }

  revokeRefreshSession(sessionId: string, revokedAt: Date) {
    return this.prisma.session.update({
      where: { id: sessionId },
      data: {
        revokedAt,
      },
    });
  }

  touchUserLastLoginAt(userId: string, lastLoginAt: Date) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        lastLoginAt,
      },
    });
  }
}
