import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ComponentsController } from './components.controller';
import {
  COMPONENTS_PRISMA_CLIENT,
  ComponentsRepository,
} from './persistence/components.repository';
import { ComponentsService } from './components.service';

@Module({
  controllers: [ComponentsController],
  providers: [
    ComponentsService,
    ComponentsRepository,
    PrismaService,
    {
      provide: COMPONENTS_PRISMA_CLIENT,
      useExisting: PrismaService,
    },
  ],
})
export class ComponentsModule {}
