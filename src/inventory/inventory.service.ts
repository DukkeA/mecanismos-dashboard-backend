import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { buildPaginationMeta } from '../common/pagination/pagination-meta';
import {
  buildOptionsResponse,
  buildQuickCreateResponse,
  type ReferenceOption,
} from '../common/reference-data';
import type { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import type { CreateInventoryMovementDto } from './dto/create-inventory-movement.dto';
import type { InventoryItemOptionsQueryDto } from './dto/inventory-item-options-query.dto';
import type { ListInventoryItemsQueryDto } from './dto/list-inventory-items-query.dto';
import {
  InventoryItemNotFoundError,
  InventoryLedgerSerializationError,
  InventoryRepository,
  NegativeInventoryStockError,
} from './persistence/inventory.repository';
import { itemSupportsPhysicalStockLedger } from './stock.helpers';

@Injectable()
export class InventoryService {
  constructor(private readonly inventoryRepository: InventoryRepository) {}

  createItem(createInventoryItemDto: CreateInventoryItemDto) {
    return this.inventoryRepository.createItem(createInventoryItemDto);
  }

  async findItemOptions(query: InventoryItemOptionsQueryDto) {
    const options = await this.inventoryRepository.findItemOptions(query);

    return buildOptionsResponse(
      options.map(mapInventoryItemOption),
      query.limit,
    );
  }

  async findAll(query: ListInventoryItemsQueryDto) {
    const result = await this.inventoryRepository.findManyItems(query);
    const currentStocks = await this.inventoryRepository.calculateCurrentStocks(
      result.items.map((item) => item.id),
    );

    return {
      data: result.items.map((item) => ({
        ...item,
        currentStock: currentStocks[item.id] ?? 0,
      })),
      meta: buildPaginationMeta(result),
    };
  }

  async findOne(id: string) {
    const item = await this.inventoryRepository.findItemById(id);

    if (!item) {
      throw new NotFoundException(`Inventory item ${id} not found`);
    }

    const currentStocks = await this.inventoryRepository.calculateCurrentStocks(
      [id],
    );

    return {
      ...item,
      currentStock: currentStocks[id] ?? 0,
    };
  }

  async createMovement(
    inventoryItemId: string,
    createInventoryMovementDto: CreateInventoryMovementDto,
  ) {
    const item = await this.inventoryRepository.findItemById(inventoryItemId);

    if (!item) {
      throw new NotFoundException(
        `Inventory item ${inventoryItemId} not found`,
      );
    }

    if (!itemSupportsPhysicalStockLedger(item.itemType)) {
      throw new BadRequestException(
        'Demand-purchased items do not allow physical stock movements',
      );
    }

    try {
      const result = await this.inventoryRepository.createMovement({
        inventoryItemId,
        ...createInventoryMovementDto,
      });

      return {
        ...result.movement,
        currentStockAfter: result.currentStockAfter,
      };
    } catch (error) {
      if (error instanceof InventoryItemNotFoundError) {
        throw new NotFoundException(error.message);
      }

      if (error instanceof NegativeInventoryStockError) {
        throw new ConflictException(
          `Inventory movement would make stock negative from ${error.currentStock}`,
        );
      }

      if (error instanceof InventoryLedgerSerializationError) {
        throw new ConflictException(
          'Inventory movement conflicted with another stock write. Retry the request.',
        );
      }

      throw error;
    }
  }

  async listItemMovements(inventoryItemId: string) {
    await this.findOne(inventoryItemId);
    return this.inventoryRepository.listMovementsByItem(inventoryItemId);
  }

  async findMovement(id: string) {
    const movement = await this.inventoryRepository.findMovementById(id);

    if (!movement) {
      throw new NotFoundException(`Inventory movement ${id} not found`);
    }

    return movement;
  }

  async quickCreateItem(createInventoryItemDto: CreateInventoryItemDto) {
    const item = await this.createItem(createInventoryItemDto);

    return buildQuickCreateResponse(mapInventoryItemOption(item), item);
  }
}

function mapInventoryItemOption(item: {
  id: string;
  name: string;
  brand?: string | null;
  reference?: string | null;
  itemType: string;
  condition: string;
  isActive: boolean;
}): ReferenceOption {
  return {
    id: item.id,
    label: item.name,
    description:
      [item.brand, item.reference].filter(Boolean).join(' · ') || undefined,
    isActive: item.isActive,
    context: {
      itemType: item.itemType,
      condition: item.condition,
    },
  };
}
