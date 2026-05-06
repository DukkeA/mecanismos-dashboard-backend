import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ServicesController } from './services.controller';
import {
  SERVICES_PRISMA_CLIENT,
  ServicesRepository,
} from './persistence/services.repository';
import { ServicesService } from './services.service';

@Module({
  controllers: [ServicesController],
  providers: [
    ServicesService,
    ServicesRepository,
    PrismaService,
    {
      provide: SERVICES_PRISMA_CLIENT,
      useExisting: PrismaService,
    },
  ],
})
export class ServicesModule {}
