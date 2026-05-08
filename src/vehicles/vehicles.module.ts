import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PrismaModule } from '../prisma/prisma.module';
import { VehiclesController } from './vehicles.controller';
import {
  VEHICLES_PRISMA_CLIENT,
  VehiclesRepository,
} from './persistence/vehicles.repository';
import { VehiclesService } from './vehicles.service';

@Module({
  imports: [PrismaModule],
  controllers: [VehiclesController],
  providers: [
    VehiclesService,
    VehiclesRepository,
    {
      provide: VEHICLES_PRISMA_CLIENT,
      useExisting: PrismaService,
    },
  ],
})
export class VehiclesModule {}
