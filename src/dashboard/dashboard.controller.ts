import { Controller, Get, Query, UseGuards } from '@nestjs/common';
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
import { DashboardActionItemsQueryDto } from './dto/dashboard-action-items-query.dto';
import { DashboardActionItemsResponseDto } from './dto/dashboard-action-items-response.dto';
import { DashboardOverviewQueryDto } from './dto/dashboard-overview-query.dto';
import { DashboardOverviewResponseDto } from './dto/dashboard-overview-response.dto';
import { DashboardOverviewService } from './dashboard.service';

@ApiTags('dashboard')
@ApiCookieAuth('md_access')
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SALES')
export class DashboardController {
  constructor(
    private readonly dashboardOverviewService: DashboardOverviewService,
  ) {}

  @Get('overview')
  @ApiOperation({
    summary: 'Get dashboard overview KPIs for a flexible date range',
  })
  @ApiOkResponse({ type: DashboardOverviewResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  getOverview(@Query() query: DashboardOverviewQueryDto) {
    return this.dashboardOverviewService.getOverview(query);
  }

  @Get('action-items')
  @ApiOperation({
    summary: 'Get operational action items for dashboard follow-up',
  })
  @ApiOkResponse({ type: DashboardActionItemsResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  getActionItems(@Query() query: DashboardActionItemsQueryDto) {
    return this.dashboardOverviewService.getActionItems(query);
  }
}
