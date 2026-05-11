import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma.service';
import { DashboardController } from './dashboard.controller';
import {
  DashboardRepository,
  DASHBOARD_PRISMA_CLIENT,
} from './dashboard.repository';
import { DashboardOverviewService } from './dashboard.service';

@Module({
  imports: [PrismaModule],
  controllers: [DashboardController],
  providers: [
    {
      provide: DASHBOARD_PRISMA_CLIENT,
      useExisting: PrismaService,
    },
    DashboardRepository,
    DashboardOverviewService,
  ],
})
export class DashboardModule {}
