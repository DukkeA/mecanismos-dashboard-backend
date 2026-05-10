import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CostCentersController } from './cost-centers.controller';
import {
  COST_CENTERS_PRISMA_CLIENT,
  CostCentersRepository,
} from './persistence/cost-centers.repository';
import { CostCentersService } from './cost-centers.service';

@Module({
  imports: [PrismaModule],
  controllers: [CostCentersController],
  providers: [
    CostCentersService,
    CostCentersRepository,
    {
      provide: COST_CENTERS_PRISMA_CLIENT,
      useExisting: PrismaService,
    },
  ],
})
export class CostCentersModule {}
