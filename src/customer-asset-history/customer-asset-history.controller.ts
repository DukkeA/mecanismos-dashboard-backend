import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CustomerAssetHistoryQueryDto } from './dto/customer-asset-history-query.dto';
import { CustomerAssetHistoryResponseDto } from './dto/customer-asset-history-response.dto';
import { CustomerAssetHistoryService } from './customer-asset-history.service';

@ApiTags('customer-asset-history')
@ApiCookieAuth('md_access')
@Controller('customer-asset-history')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SALES')
export class CustomerAssetHistoryController {
  constructor(
    private readonly customerAssetHistoryService: CustomerAssetHistoryService,
  ) {}

  @Get('customers/:customerId')
  @ApiOperation({ summary: 'Get concise scoped history for one customer' })
  @ApiOkResponse({ type: CustomerAssetHistoryResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  getCustomerHistory(
    @Param('customerId') customerId: string,
    @Query() query: CustomerAssetHistoryQueryDto,
  ) {
    return this.customerAssetHistoryService.getCustomerHistory(
      customerId,
      query,
    );
  }

  @Get('vehicles/:vehicleId')
  @ApiOperation({ summary: 'Get concise scoped history for one vehicle' })
  @ApiOkResponse({ type: CustomerAssetHistoryResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  getVehicleHistory(
    @Param('vehicleId') vehicleId: string,
    @Query() query: CustomerAssetHistoryQueryDto,
  ) {
    return this.customerAssetHistoryService.getVehicleHistory(vehicleId, query);
  }

  @Get('components/:componentId')
  @ApiOperation({ summary: 'Get concise scoped history for one component' })
  @ApiOkResponse({ type: CustomerAssetHistoryResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  getComponentHistory(
    @Param('componentId') componentId: string,
    @Query() query: CustomerAssetHistoryQueryDto,
  ) {
    return this.customerAssetHistoryService.getComponentHistory(
      componentId,
      query,
    );
  }
}
