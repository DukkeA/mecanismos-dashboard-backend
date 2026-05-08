import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ComponentTypesController } from './component-types.controller';
import {
  COMPONENT_TYPES_PRISMA_CLIENT,
  ComponentTypesRepository,
} from './persistence/component-types.repository';
import { ComponentTypesService } from './component-types.service';

@Module({
  imports: [PrismaModule],
  controllers: [ComponentTypesController],
  providers: [
    ComponentTypesService,
    ComponentTypesRepository,
    {
      provide: COMPONENT_TYPES_PRISMA_CLIENT,
      useExisting: PrismaService,
    },
  ],
})
export class ComponentTypesModule {}
