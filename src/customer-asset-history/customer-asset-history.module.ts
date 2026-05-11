import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma.service';
import { CustomerAssetHistoryController } from './customer-asset-history.controller';
import { CustomerAssetHistoryService } from './customer-asset-history.service';
import { CustomerAssetHistoryRepository } from './persistence/customer-asset-history.repository';
import { CUSTOMER_ASSET_HISTORY_PRISMA_CLIENT } from './customer-asset-history.tokens';

@Module({
  imports: [PrismaModule],
  controllers: [CustomerAssetHistoryController],
  providers: [
    {
      provide: CUSTOMER_ASSET_HISTORY_PRISMA_CLIENT,
      useExisting: PrismaService,
    },
    CustomerAssetHistoryRepository,
    CustomerAssetHistoryService,
  ],
})
export class CustomerAssetHistoryModule {}
