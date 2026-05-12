import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaService } from '../prisma.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthController } from './auth.controller';
import { AuthOriginGuard } from './auth-origin.guard';
import { AuthService } from './auth.service';
import { JwtStrategy } from './auth.jwt';
import { AUTH_RUNTIME_CONFIG, authConfigFromEnv } from './config/auth.config';
import { JwtAuthGuard } from './jwt-auth.guard';
import {
  AUTH_PRISMA_CLIENT,
  AuthSessionRepository,
} from './persistence/auth-session.repository';
import { RecoveryPhraseGenerator } from './recovery-phrase.generator';
import { RecoveryPhraseRateLimiter } from './recovery-phrase-rate-limiter';
import { RolesGuard } from './roles.guard';

@Module({
  imports: [
    PrismaModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthOriginGuard,
    RecoveryPhraseGenerator,
    RecoveryPhraseRateLimiter,
    AuthSessionRepository,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    {
      provide: AUTH_PRISMA_CLIENT,
      useExisting: PrismaService,
    },
    {
      provide: AUTH_RUNTIME_CONFIG,
      useFactory: () => authConfigFromEnv(process.env),
    },
  ],
  exports: [
    AuthSessionRepository,
    RecoveryPhraseGenerator,
    RecoveryPhraseRateLimiter,
  ],
})
export class AuthModule {}
