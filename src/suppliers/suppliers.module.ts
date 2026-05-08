import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ProcurementModule } from '../procurement/procurement.module';
import {
  SUPPLIERS_PRISMA_CLIENT,
  SuppliersRepository,
} from './persistence/suppliers.repository';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';

@Module({
  imports: [PrismaModule, ProcurementModule],
  controllers: [SuppliersController],
  providers: [
    SuppliersService,
    SuppliersRepository,
    {
      provide: SUPPLIERS_PRISMA_CLIENT,
      useExisting: PrismaService,
    },
  ],
})
export class SuppliersModule {}
