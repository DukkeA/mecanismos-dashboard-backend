import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  QuickCreateResponseDto,
  ReferenceOptionsResponseDto,
} from '../common/reference-data';
import {
  ApiConflictResponse,
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
import { CostCentersService } from './cost-centers.service';
import { CostCenterOptionsQueryDto } from './dto/cost-center-options-query.dto';
import { CreateCostCenterDto } from './dto/create-cost-center.dto';
import { ListCostCentersQueryDto } from './dto/list-cost-centers-query.dto';
import { UpdateCostCenterDto } from './dto/update-cost-center.dto';

@ApiTags('cost-centers')
@ApiCookieAuth('md_access')
@Controller('cost-centers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SALES')
export class CostCentersController {
  constructor(private readonly costCentersService: CostCentersService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a cost center with canonical code uniqueness',
  })
  @ApiCreatedResponse({ description: 'Cost center created.' })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  @ApiConflictResponse({ description: 'Canonical code already exists.' })
  create(@Body() createCostCenterDto: CreateCostCenterDto) {
    return this.costCentersService.create(createCostCenterDto);
  }

  @Get()
  @ApiOperation({
    summary: 'List cost centers with pragmatic pagination and filters',
  })
  @ApiOkResponse({ description: 'Paginated cost-center list returned.' })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  findAll(@Query() query: ListCostCentersQueryDto) {
    return this.costCentersService.findAll(query);
  }

  @Get('options')
  @ApiOperation({
    summary: 'List lightweight cost-center options for frontend comboboxes',
  })
  @ApiOkResponse({
    description: 'Cost-center options returned.',
    type: ReferenceOptionsResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  findOptions(@Query() query: CostCenterOptionsQueryDto) {
    return this.costCentersService.findOptions(query);
  }

  @Post('quick-create')
  @ApiOperation({
    summary:
      'Quick-create a cost center and return an option-compatible result',
  })
  @ApiCreatedResponse({
    description: 'Cost center quick-created.',
    type: QuickCreateResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  @ApiConflictResponse({ description: 'Canonical code already exists.' })
  createQuick(@Body() createCostCenterDto: CreateCostCenterDto) {
    return this.costCentersService.quickCreate(createCostCenterDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a cost center by id' })
  @ApiOkResponse({ description: 'Cost center returned.' })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  @ApiNotFoundResponse({ description: 'Cost center not found.' })
  findOne(@Param('id') id: string) {
    return this.costCentersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a cost center and toggle active lifecycle state',
  })
  @ApiOkResponse({ description: 'Cost center updated.' })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  @ApiNotFoundResponse({ description: 'Cost center not found.' })
  @ApiConflictResponse({ description: 'Canonical code already exists.' })
  update(
    @Param('id') id: string,
    @Body() updateCostCenterDto: UpdateCostCenterDto,
  ) {
    return this.costCentersService.update(id, updateCostCenterDto);
  }
}
