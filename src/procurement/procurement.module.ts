import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  PROCUREMENT_PRISMA_CLIENT,
  ProcurementRepository,
} from './persistence/procurement.repository';
import { ProcurementService } from './procurement.service';
import { SupplierQuotesController } from './supplier-quotes.controller';

@Module({
  controllers: [SupplierQuotesController],
  providers: [
    ProcurementService,
    ProcurementRepository,
    PrismaService,
    {
      provide: PROCUREMENT_PRISMA_CLIENT,
      useExisting: PrismaService,
    },
  ],
  exports: [ProcurementService],
})
export class ProcurementModule {}
