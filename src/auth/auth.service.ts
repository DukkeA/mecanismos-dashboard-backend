import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcrypt';
import { createHash, randomUUID } from 'crypto';
import { LoginDto } from './dto/login.dto';
import type { ChangePasswordDto } from './dto/change-password.dto';
import type {
  GenerateRecoveryPhraseDto,
  GenerateRecoveryPhraseResponseDto,
  RecoverWithPhraseDto,
  RecoveryPhraseStatusDto,
} from './dto/recovery-phrase.dto';
import { AUTH_RUNTIME_CONFIG } from './config/auth.config';
import type { AuthRuntimeConfig } from './config/auth.config';
import { AuthSessionRepository } from './persistence/auth-session.repository';
import {
  normalizeRecoveryPhrase,
  RecoveryPhraseGenerator,
} from './recovery-phrase.generator';
import { RecoveryPhraseRateLimiter } from './recovery-phrase-rate-limiter';

export type AuthRequestContext = {
  ipAddress?: string;
  userAgent?: string;
};

export type AuthUserPayload = {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'SALES' | 'MECHANIC';
  mustChangePassword: boolean;
};

type AuthUserRecord = AuthUserPayload & {
  authVersion: number;
};

export type AuthTokensResult = {
  user: AuthUserPayload;
  accessToken: string;
  refreshToken: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly authSessionRepository: AuthSessionRepository,
    private readonly jwtService: JwtService,
    @Inject(AUTH_RUNTIME_CONFIG)
    private readonly authConfig: AuthRuntimeConfig,
    private readonly recoveryPhraseGenerator: RecoveryPhraseGenerator,
    private readonly recoveryPhraseRateLimiter: RecoveryPhraseRateLimiter,
  ) {}

  async login(
    credentials: LoginDto,
    context: AuthRequestContext,
  ): Promise<AuthTokensResult> {
    const account =
      await this.authSessionRepository.findActivePasswordCredentialByEmail(
        credentials.email,
      );

    if (!account) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await compare(
      credentials.password,
      account.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const now = new Date();
    const refreshToken = randomUUID();
    const sessionId = randomUUID();

    await this.authSessionRepository.touchUserLastLoginAt(account.user.id, now);
    await this.authSessionRepository.createRefreshSession({
      sessionId,
      userId: account.user.id,
      familyId: sessionId,
      tokenDigest: this.digestToken(refreshToken),
      expiresAt: this.createExpiryDate(
        this.authConfig.refreshTokenTtlSeconds,
        now,
      ),
      lastUsedAt: now,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return this.buildTokensResult(account.user, refreshToken);
  }

  async refresh(
    refreshToken: string | undefined,
    context: AuthRequestContext,
  ): Promise<AuthTokensResult> {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const session =
      await this.authSessionRepository.findRefreshSessionByTokenDigest(
        this.digestToken(refreshToken),
      );

    if (!session || !session.user.isActive) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const now = new Date();

    if (session.revokedAt || session.replacedBySessionId) {
      await this.authSessionRepository.revokeRefreshFamily(
        session.familyId,
        now,
      );
      throw new UnauthorizedException('Refresh token is no longer valid');
    }

    if (session.expiresAt.getTime() <= now.getTime()) {
      throw new UnauthorizedException('Refresh token is no longer valid');
    }

    const replacementRefreshToken = randomUUID();

    await this.authSessionRepository.rotateRefreshSession({
      currentSessionId: session.id,
      newSessionId: randomUUID(),
      userId: session.userId,
      familyId: session.familyId,
      newTokenDigest: this.digestToken(replacementRefreshToken),
      expiresAt: this.createExpiryDate(
        this.authConfig.refreshTokenTtlSeconds,
        now,
      ),
      rotatedAt: now,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return this.buildTokensResult(session.user, replacementRefreshToken);
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) {
      return;
    }

    const session =
      await this.authSessionRepository.findRefreshSessionByTokenDigest(
        this.digestToken(refreshToken),
      );

    if (!session || session.revokedAt) {
      return;
    }

    await this.authSessionRepository.revokeRefreshSession(
      session.id,
      new Date(),
    );
  }

  async getCurrentUser(userId: string): Promise<AuthUserPayload> {
    const user = await this.authSessionRepository.findActiveUserById(userId);

    if (!user) {
      throw new UnauthorizedException('Authenticated user is no longer active');
    }

    return this.toAuthUserPayload(user);
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<AuthUserPayload> {
    const account =
      await this.authSessionRepository.findActivePasswordCredentialByUserId(
        userId,
      );

    if (!account) {
      throw new UnauthorizedException('Authenticated user is no longer active');
    }

    const passwordMatches = await compare(
      dto.currentPassword,
      account.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const updatedUser =
      await this.authSessionRepository.updatePasswordCredential(userId, {
        passwordHash: await hash(dto.newPassword, 12),
        passwordUpdatedAt: new Date(),
        mustChangePassword: false,
        bumpAuthVersion: true,
      });

    return this.toAuthUserPayload(updatedUser);
  }

  async getRecoveryPhraseStatus(
    userId: string,
  ): Promise<RecoveryPhraseStatusDto> {
    const account =
      await this.authSessionRepository.findActiveRecoveryCredentialByUserId(
        userId,
      );

    if (!account) {
      throw new UnauthorizedException('Authenticated user is no longer active');
    }

    return {
      enabled: Boolean(account.recoveryPhraseHash),
      generatedAt: account.recoveryPhraseGeneratedAt?.toISOString() ?? null,
      consumedAt: account.recoveryPhraseConsumedAt?.toISOString() ?? null,
    };
  }

  async generateRecoveryPhrase(
    userId: string,
    dto: GenerateRecoveryPhraseDto,
  ): Promise<GenerateRecoveryPhraseResponseDto> {
    const account =
      await this.authSessionRepository.findActiveRecoveryCredentialByUserId(
        userId,
      );

    if (!account) {
      throw new UnauthorizedException('Authenticated user is no longer active');
    }

    const passwordMatches = await compare(
      dto.currentPassword,
      account.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const phrase = this.recoveryPhraseGenerator.generate();
    const generatedAt = new Date();

    await this.authSessionRepository.storeRecoveryPhraseHash(userId, {
      recoveryPhraseHash: await hash(phrase, 12),
      generatedAt,
    });

    return {
      phrase,
      words: phrase.split(' '),
      generatedAt: generatedAt.toISOString(),
    };
  }

  async recoverWithPhrase(
    dto: RecoverWithPhraseDto,
    context: AuthRequestContext = {},
  ): Promise<{ success: true }> {
    const limiterInput = {
      email: dto.email,
      ipAddress: context.ipAddress,
    };

    this.recoveryPhraseRateLimiter.assertAllowed(limiterInput);

    const account =
      await this.authSessionRepository.findActiveRecoveryCredentialByEmail(
        dto.email,
      );

    if (
      !account ||
      !account.user.isActive ||
      !account.recoveryPhraseHash ||
      account.recoveryPhraseConsumedAt
    ) {
      this.recoveryPhraseRateLimiter.recordFailure(limiterInput);
      throw this.genericRecoveryFailure();
    }

    const phraseMatches = await compare(
      normalizeRecoveryPhrase(dto.recoveryPhrase),
      account.recoveryPhraseHash,
    );

    if (!phraseMatches) {
      this.recoveryPhraseRateLimiter.recordFailure(limiterInput);
      throw this.genericRecoveryFailure();
    }

    const recoveredAt = new Date();

    await this.authSessionRepository.recoverPasswordWithPhrase(
      account.user.id,
      {
        passwordHash: await hash(dto.newPassword, 12),
        passwordUpdatedAt: recoveredAt,
        recoveryPhraseConsumedAt: recoveredAt,
        bumpAuthVersion: true,
      },
    );

    this.recoveryPhraseRateLimiter.recordSuccess(limiterInput);

    return { success: true };
  }

  private async buildTokensResult(
    user: AuthUserRecord,
    refreshToken: string,
  ): Promise<AuthTokensResult> {
    return {
      user: this.toAuthUserPayload(user),
      accessToken: await this.jwtService.signAsync(
        { sub: user.id, role: user.role, authVersion: user.authVersion },
        {
          secret: this.authConfig.accessTokenSecret,
          expiresIn: this.authConfig.accessTokenTtlSeconds,
        },
      ),
      refreshToken,
    };
  }

  private toAuthUserPayload(user: AuthUserPayload): AuthUserPayload {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    };
  }

  private createExpiryDate(ttlSeconds: number, now: Date) {
    return new Date(now.getTime() + ttlSeconds * 1000);
  }

  private digestToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private genericRecoveryFailure() {
    return new UnauthorizedException('Recovery failed');
  }
}
