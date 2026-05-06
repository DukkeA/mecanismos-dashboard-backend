import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ProcurementModule } from '../procurement/procurement.module';
import {
  SUPPLIERS_PRISMA_CLIENT,
  SuppliersRepository,
} from './persistence/suppliers.repository';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';

@Module({
  imports: [ProcurementModule],
  controllers: [SuppliersController],
  providers: [
    SuppliersService,
    SuppliersRepository,
    PrismaService,
    {
      provide: SUPPLIERS_PRISMA_CLIENT,
      useExisting: PrismaService,
    },
  ],
})
export class SuppliersModule {}
