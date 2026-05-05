import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaService } from '../prisma.service';
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
import { RolesGuard } from './roles.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthOriginGuard,
    AuthSessionRepository,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    PrismaService,
    {
      provide: AUTH_PRISMA_CLIENT,
      useExisting: PrismaService,
    },
    {
      provide: AUTH_RUNTIME_CONFIG,
      useFactory: () => authConfigFromEnv(process.env),
    },
  ],
})
export class AuthModule {}
