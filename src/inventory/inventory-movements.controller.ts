import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { InventoryService } from './inventory.service';

@ApiTags('inventory')
@ApiCookieAuth('md_access')
@Controller('inventory-movements')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SALES')
export class InventoryMovementsController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get one persisted inventory movement by id' })
  @ApiOkResponse({ description: 'Inventory movement returned.' })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  @ApiNotFoundResponse({ description: 'Inventory movement not found.' })
  findOne(@Param('id') id: string) {
    return this.inventoryService.findMovement(id);
  }
}
