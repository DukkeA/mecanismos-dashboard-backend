import { Inject, Injectable } from '@nestjs/common';

export const AUTH_PRISMA_CLIENT = Symbol('AUTH_PRISMA_CLIENT');

type CredentialAccountRecord = {
  id: string;
  passwordHash: string;
  recoveryPhraseHash?: string | null;
  recoveryPhraseGeneratedAt?: Date | null;
  recoveryPhraseConsumedAt?: Date | null;
  user: {
    id: string;
    email: string;
    name: string;
    role: 'ADMIN' | 'SALES' | 'MECHANIC';
    isActive: boolean;
    authVersion: number;
    mustChangePassword: boolean;
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
    authVersion: number;
    mustChangePassword: boolean;
  };
};

type ActiveUserRecord = {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'SALES' | 'MECHANIC';
  isActive: boolean;
  authVersion: number;
  mustChangePassword: boolean;
};

type AuthPrismaClient = {
  account: {
    findFirst(args: {
      where: {
        user: {
          email?: string;
          id?: string;
          isActive: true;
        };
      };
      include?: { user: true };
      select?: {
        id: true;
        passwordHash: true;
        recoveryPhraseHash: true;
        recoveryPhraseGeneratedAt: true;
        recoveryPhraseConsumedAt: true;
        user: {
          select: {
            id: true;
            email: true;
            name: true;
            role: true;
            isActive: true;
            authVersion: true;
            mustChangePassword: true;
          };
        };
      };
    }): Promise<CredentialAccountRecord | null>;
    update(args: {
      where: { userId: string };
      data: {
        passwordHash?: string;
        passwordUpdatedAt?: Date;
        recoveryPhraseHash?: string | null;
        recoveryPhraseGeneratedAt?: Date | null;
        recoveryPhraseConsumedAt?: Date | null;
        updatedAt: Date;
      };
    }): Promise<unknown>;
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
        updatedAt: Date;
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
        updatedAt: Date;
      };
    }): Promise<unknown>;
    updateMany(args: {
      where: { familyId?: string; userId?: string; revokedAt: null };
      data: { revokedAt: Date; updatedAt: Date };
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
        authVersion: true;
        mustChangePassword: true;
      };
    }): Promise<ActiveUserRecord | null>;
    update(args: {
      where: { id: string };
      data: {
        lastLoginAt?: Date;
        mustChangePassword?: boolean;
        authVersion?: { increment: 1 };
        updatedAt?: Date;
      };
      select?: {
        id: true;
        email: true;
        name: true;
        role: true;
        isActive: true;
        authVersion: true;
        mustChangePassword: true;
      };
    }): Promise<ActiveUserRecord>;
  };
  $transaction?<T>(
    callback: (tx: AuthPrismaTransaction) => Promise<T>,
  ): Promise<T>;
};

type AuthPrismaTransaction = {
  account: {
    update(args: {
      where: { userId: string };
      data: {
        passwordHash: string;
        passwordUpdatedAt: Date;
        recoveryPhraseHash?: null;
        recoveryPhraseConsumedAt?: Date;
        updatedAt: Date;
      };
    }): Promise<unknown>;
  };
  user: {
    update(args: {
      where: { id: string };
      data: {
        mustChangePassword: boolean;
        authVersion?: { increment: 1 };
        updatedAt: Date;
      };
      select: {
        id: true;
        email: true;
        name: true;
        role: true;
        isActive: true;
        authVersion: true;
        mustChangePassword: true;
      };
    }): Promise<ActiveUserRecord>;
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
        updatedAt: Date;
        ipAddress?: string;
        userAgent?: string;
      };
    }): Promise<RefreshSessionRecord>;
    update(args: {
      where: { id: string };
      data: {
        revokedAt: Date;
        replacedBySessionId: string;
        lastUsedAt: Date;
        updatedAt: Date;
      };
    }): Promise<unknown>;
    updateMany(args: {
      where: { userId: string; revokedAt: null };
      data: { revokedAt: Date; updatedAt: Date };
    }): Promise<{ count: number }>;
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
        authVersion: true,
        mustChangePassword: true,
      },
    });
  }

  findActivePasswordCredentialByUserId(userId: string) {
    return this.prisma.account.findFirst({
      where: {
        user: {
          id: userId,
          isActive: true,
        },
      },
      include: {
        user: true,
      },
    });
  }

  findActiveRecoveryCredentialByUserId(userId: string) {
    return this.prisma.account.findFirst({
      where: {
        user: {
          id: userId,
          isActive: true,
        },
      },
      select: {
        id: true,
        passwordHash: true,
        recoveryPhraseHash: true,
        recoveryPhraseGeneratedAt: true,
        recoveryPhraseConsumedAt: true,
        user: {
          select: activeUserSelect,
        },
      },
    });
  }

  findActiveRecoveryCredentialByEmail(email: string) {
    return this.prisma.account.findFirst({
      where: {
        user: {
          email: email.trim().toLowerCase(),
          isActive: true,
        },
      },
      select: this.recoveryCredentialSelect(),
    });
  }

  storeRecoveryPhraseHash(
    userId: string,
    input: { recoveryPhraseHash: string; generatedAt: Date },
  ) {
    return this.prisma.account.update({
      where: { userId },
      data: {
        recoveryPhraseHash: input.recoveryPhraseHash,
        recoveryPhraseGeneratedAt: input.generatedAt,
        recoveryPhraseConsumedAt: null,
        updatedAt: input.generatedAt,
      },
    });
  }

  async updatePasswordCredential(
    userId: string,
    input: {
      passwordHash: string;
      passwordUpdatedAt: Date;
      mustChangePassword: boolean;
      bumpAuthVersion?: boolean;
    },
  ) {
    if (!this.prisma.$transaction) {
      throw new Error(
        'Prisma transaction support is required for password update',
      );
    }

    return this.prisma.$transaction(async (tx) => {
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
          ...(input.bumpAuthVersion ? { authVersion: { increment: 1 } } : {}),
          updatedAt: input.passwordUpdatedAt,
        },
        select: activeUserSelect,
      });
    });
  }

  async recoverPasswordWithPhrase(
    userId: string,
    input: {
      passwordHash: string;
      passwordUpdatedAt: Date;
      recoveryPhraseConsumedAt: Date;
      bumpAuthVersion?: boolean;
    },
  ) {
    if (!this.prisma.$transaction) {
      throw new Error(
        'Prisma transaction support is required for recovery password reset',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.account.update({
        where: { userId },
        data: {
          passwordHash: input.passwordHash,
          passwordUpdatedAt: input.passwordUpdatedAt,
          recoveryPhraseHash: null,
          recoveryPhraseConsumedAt: input.recoveryPhraseConsumedAt,
          updatedAt: input.passwordUpdatedAt,
        },
      });

      const user = await tx.user.update({
        where: { id: userId },
        data: {
          mustChangePassword: false,
          ...(input.bumpAuthVersion ? { authVersion: { increment: 1 } } : {}),
          updatedAt: input.passwordUpdatedAt,
        },
        select: activeUserSelect,
      });

      await tx.session.updateMany({
        where: { userId, revokedAt: null },
        data: {
          revokedAt: input.recoveryPhraseConsumedAt,
          updatedAt: input.recoveryPhraseConsumedAt,
        },
      });

      return user;
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
          updatedAt: input.rotatedAt,
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
          updatedAt: input.rotatedAt,
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
        updatedAt: input.lastUsedAt,
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
        updatedAt: revokedAt,
      },
    });

    return result.count;
  }

  revokeRefreshSession(sessionId: string, revokedAt: Date) {
    return this.prisma.session.update({
      where: { id: sessionId },
      data: {
        revokedAt,
        updatedAt: revokedAt,
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

  private recoveryCredentialSelect() {
    return {
      id: true,
      passwordHash: true,
      recoveryPhraseHash: true,
      recoveryPhraseGeneratedAt: true,
      recoveryPhraseConsumedAt: true,
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          authVersion: true,
          mustChangePassword: true,
        },
      },
    } as const;
  }
}

const activeUserSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  authVersion: true,
  mustChangePassword: true,
} as const;
