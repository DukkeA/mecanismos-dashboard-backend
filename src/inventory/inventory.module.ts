import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ProcurementModule } from '../procurement/procurement.module';
import { InventoryItemsController } from './inventory-items.controller';
import { InventoryMovementsController } from './inventory-movements.controller';
import {
  INVENTORY_PRISMA_CLIENT,
  InventoryRepository,
} from './persistence/inventory.repository';
import { InventoryService } from './inventory.service';

@Module({
  imports: [PrismaModule, ProcurementModule],
  controllers: [InventoryItemsController, InventoryMovementsController],
  providers: [
    InventoryService,
    InventoryRepository,
    {
      provide: INVENTORY_PRISMA_CLIENT,
      useExisting: PrismaService,
    },
  ],
  exports: [InventoryService],
})
export class InventoryModule {}
