import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ServicesController } from './services.controller';
import {
  SERVICES_PRISMA_CLIENT,
  ServicesRepository,
} from './persistence/services.repository';
import { ServicesService } from './services.service';

@Module({
  imports: [PrismaModule],
  controllers: [ServicesController],
  providers: [
    ServicesService,
    ServicesRepository,
    {
      provide: SERVICES_PRISMA_CLIENT,
      useExisting: PrismaService,
    },
  ],
})
export class ServicesModule {}
