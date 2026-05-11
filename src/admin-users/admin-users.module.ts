import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
import {
  ADMIN_USERS_PRISMA_CLIENT,
  AdminUsersRepository,
} from './persistence/admin-users.repository';

@Module({
  imports: [PrismaModule],
  controllers: [AdminUsersController],
  providers: [
    AdminUsersService,
    AdminUsersRepository,
    {
      provide: ADMIN_USERS_PRISMA_CLIENT,
      useExisting: PrismaService,
    },
  ],
})
export class AdminUsersModule {}
