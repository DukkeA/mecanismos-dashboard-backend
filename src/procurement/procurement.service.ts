import { Injectable, NotFoundException } from '@nestjs/common';
import type { CreateSupplierQuoteDto } from './dto/create-supplier-quote.dto';
import type { ListSupplierQuotesQueryDto } from './dto/list-supplier-quotes-query.dto';
import type { UpdateSupplierQuoteDto } from './dto/update-supplier-quote.dto';
import type { VoidSupplierQuoteDto } from './dto/void-supplier-quote.dto';
import {
  InventoryQuoteItemNotFoundError,
  ProcurementRepository,
  SupplierNotFoundError,
} from './persistence/procurement.repository';

@Injectable()
export class ProcurementService {
  constructor(private readonly procurementRepository: ProcurementRepository) {}

  async createQuote(createSupplierQuoteDto: CreateSupplierQuoteDto) {
    await this.procurementRepository.ensureSupplierExists(
      createSupplierQuoteDto.supplierId,
    );
    await this.procurementRepository.ensureInventoryItemExists(
      createSupplierQuoteDto.inventoryItemId,
    );

    return this.procurementRepository.createQuote(createSupplierQuoteDto);
  }

  async findItemQuoteLookup(inventoryItemId: string) {
    try {
      await this.procurementRepository.ensureInventoryItemExists(
        inventoryItemId,
      );
      return await this.procurementRepository.findItemQuoteLookup(
        inventoryItemId,
      );
    } catch (error) {
      if (error instanceof InventoryQuoteItemNotFoundError) {
        throw new NotFoundException(error.message);
      }

      throw error;
    }
  }

  async findSupplierQuoteTimeline(
    supplierId: string,
    query: ListSupplierQuotesQueryDto,
  ) {
    try {
      await this.procurementRepository.ensureSupplierExists(supplierId);
      const result = await this.procurementRepository.findSupplierQuoteTimeline(
        supplierId,
        query,
      );

      return {
        data: result.items,
        meta: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / result.limit),
        },
      };
    } catch (error) {
      if (error instanceof SupplierNotFoundError) {
        throw new NotFoundException(error.message);
      }

      throw error;
    }
  }

  async updateQuote(
    id: string,
    updateSupplierQuoteDto: UpdateSupplierQuoteDto,
  ) {
    const quote = await this.procurementRepository.findQuoteById(id);

    if (!quote) {
      throw new NotFoundException(`Supplier quote ${id} not found`);
    }

    return this.procurementRepository.updateQuoteCorrection(
      id,
      updateSupplierQuoteDto,
    );
  }

  async voidQuote(id: string, voidSupplierQuoteDto: VoidSupplierQuoteDto) {
    const quote = await this.procurementRepository.findQuoteById(id);

    if (!quote) {
      throw new NotFoundException(`Supplier quote ${id} not found`);
    }

    return this.procurementRepository.voidQuote(
      id,
      voidSupplierQuoteDto.voidReason,
    );
  }
}
