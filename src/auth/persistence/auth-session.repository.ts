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

type AuthPrismaClient = {
  account: {
    findFirst(args: {
      where: { user: { email: string; isActive: true } };
      include: { user: true };
    }): Promise<CredentialAccountRecord | null>;
  };
  session: {
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

export class AuthSessionRepository {
  constructor(private readonly prisma: AuthPrismaClient) {}

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
}
