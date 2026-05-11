import { Inject, Injectable } from '@nestjs/common';
import { CUSTOMER_ASSET_HISTORY_PRISMA_CLIENT } from '../customer-asset-history.tokens';

@Injectable()
export class CustomerAssetHistoryRepository {
  constructor(
    @Inject(CUSTOMER_ASSET_HISTORY_PRISMA_CLIENT)
    private readonly prisma: unknown,
  ) {
    void this.prisma;
  }
}
