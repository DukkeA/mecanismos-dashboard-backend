import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PrismaModule } from '../prisma/prisma.module';
import {
  PROCUREMENT_PRISMA_CLIENT,
  ProcurementRepository,
} from './persistence/procurement.repository';
import { ProcurementService } from './procurement.service';
import { SupplierQuotesController } from './supplier-quotes.controller';

@Module({
  imports: [PrismaModule],
  controllers: [SupplierQuotesController],
  providers: [
    ProcurementService,
    ProcurementRepository,
    {
      provide: PROCUREMENT_PRISMA_CLIENT,
      useExisting: PrismaService,
    },
  ],
  exports: [ProcurementService],
})
export class ProcurementModule {}
