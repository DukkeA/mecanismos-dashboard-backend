import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ComponentsController } from './components.controller';
import {
  COMPONENTS_PRISMA_CLIENT,
  ComponentsRepository,
} from './persistence/components.repository';
import { ComponentsService } from './components.service';

@Module({
  imports: [PrismaModule],
  controllers: [ComponentsController],
  providers: [
    ComponentsService,
    ComponentsRepository,
    {
      provide: COMPONENTS_PRISMA_CLIENT,
      useExisting: PrismaService,
    },
  ],
})
export class ComponentsModule {}
