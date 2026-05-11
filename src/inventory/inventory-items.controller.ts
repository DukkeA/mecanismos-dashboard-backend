import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  QuickCreateResponseDto,
  ReferenceOptionsResponseDto,
} from '../common/reference-data';
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ProcurementService } from '../procurement/procurement.service';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { CreateInventoryMovementDto } from './dto/create-inventory-movement.dto';
import { InventoryItemOptionsQueryDto } from './dto/inventory-item-options-query.dto';
import { ListInventoryItemsQueryDto } from './dto/list-inventory-items-query.dto';
import { InventoryService } from './inventory.service';

@ApiTags('inventory')
@ApiCookieAuth('md_access')
@Controller('inventory-items')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SALES')
export class InventoryItemsController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly procurementService: ProcurementService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create an inventory catalog item without editing stock directly',
  })
  @ApiCreatedResponse({ description: 'Inventory item created.' })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  create(@Body() createInventoryItemDto: CreateInventoryItemDto) {
    return this.inventoryService.createItem(createInventoryItemDto);
  }

  @Get()
  @ApiOperation({
    summary:
      'List inventory items with derived current stock and pragmatic search',
  })
  @ApiOkResponse({ description: 'Paginated inventory list returned.' })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  findAll(@Query() query: ListInventoryItemsQueryDto) {
    return this.inventoryService.findAll(query);
  }

  @Get('options')
  @ApiOperation({
    summary: 'List lightweight inventory item options for frontend comboboxes',
  })
  @ApiOkResponse({
    description: 'Inventory item options returned.',
    type: ReferenceOptionsResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  findOptions(@Query() query: InventoryItemOptionsQueryDto) {
    return this.inventoryService.findItemOptions(query);
  }

  @Post('quick-create')
  @ApiOperation({
    summary:
      'Quick-create an inventory item without creating stock movements and return an option-compatible result',
  })
  @ApiCreatedResponse({
    description: 'Inventory item quick-created.',
    type: QuickCreateResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  createQuick(@Body() createInventoryItemDto: CreateInventoryItemDto) {
    return this.inventoryService.quickCreateItem(createInventoryItemDto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get one inventory item with derived current stock',
  })
  @ApiOkResponse({ description: 'Inventory item returned.' })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  @ApiNotFoundResponse({ description: 'Inventory item not found.' })
  findOne(@Param('id') id: string) {
    return this.inventoryService.findOne(id);
  }

  @Get(':id/movements')
  @ApiOperation({
    summary: 'List chronological stock ledger movements for an inventory item',
  })
  @ApiOkResponse({ description: 'Inventory movement timeline returned.' })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  @ApiNotFoundResponse({ description: 'Inventory item not found.' })
  listMovements(@Param('id') id: string) {
    return this.inventoryService.listItemMovements(id);
  }

  @Post(':id/movements')
  @ApiOperation({
    summary: 'Create a stock ledger movement and return currentStockAfter',
  })
  @ApiCreatedResponse({ description: 'Inventory movement created.' })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  @ApiNotFoundResponse({ description: 'Inventory item not found.' })
  createMovement(
    @Param('id') id: string,
    @Body() createInventoryMovementDto: CreateInventoryMovementDto,
  ) {
    return this.inventoryService.createMovement(id, createInventoryMovementDto);
  }

  @Get(':id/supplier-quotes')
  @ApiOperation({
    summary:
      'Show latest valid quotes per supplier plus full item quote history',
  })
  @ApiOkResponse({
    description: 'Item-centric supplier quote lookup returned.',
  })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  @ApiNotFoundResponse({ description: 'Inventory item not found.' })
  findSupplierQuotes(@Param('id') id: string) {
    return this.procurementService.findItemQuoteLookup(id);
  }
}
