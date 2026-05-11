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
import { CreateServiceDto } from './dto/create-service.dto';
import { ListServicesQueryDto } from './dto/list-services-query.dto';
import { ServiceOptionsQueryDto } from './dto/service-options-query.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ServicesService } from './services.service';

@ApiTags('services')
@ApiCookieAuth('md_access')
@Controller('services')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SALES')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a catalog service with canonical slug uniqueness',
  })
  @ApiCreatedResponse({ description: 'Service created.' })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  @ApiConflictResponse({ description: 'Canonical slug already exists.' })
  create(@Body() createServiceDto: CreateServiceDto) {
    return this.servicesService.create(createServiceDto);
  }

  @Get()
  @ApiOperation({
    summary: 'List services with pragmatic pagination and filters',
  })
  @ApiOkResponse({ description: 'Paginated service list returned.' })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  findAll(@Query() query: ListServicesQueryDto) {
    return this.servicesService.findAll(query);
  }

  @Get('options')
  @ApiOperation({
    summary: 'List lightweight service options for frontend comboboxes',
  })
  @ApiOkResponse({
    description: 'Service options returned.',
    type: ReferenceOptionsResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  findOptions(@Query() query: ServiceOptionsQueryDto) {
    return this.servicesService.findOptions(query);
  }

  @Post('quick-create')
  @ApiOperation({
    summary: 'Quick-create a service and return an option-compatible result',
  })
  @ApiCreatedResponse({
    description: 'Service quick-created.',
    type: QuickCreateResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  @ApiConflictResponse({ description: 'Canonical slug already exists.' })
  createQuick(@Body() createServiceDto: CreateServiceDto) {
    return this.servicesService.quickCreate(createServiceDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a service by id' })
  @ApiOkResponse({ description: 'Service returned.' })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  @ApiNotFoundResponse({ description: 'Service not found.' })
  findOne(@Param('id') id: string) {
    return this.servicesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a service and regenerate canonical slug when name changes',
  })
  @ApiOkResponse({ description: 'Service updated.' })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  @ApiNotFoundResponse({ description: 'Service not found.' })
  @ApiConflictResponse({ description: 'Canonical slug already exists.' })
  update(@Param('id') id: string, @Body() updateServiceDto: UpdateServiceDto) {
    return this.servicesService.update(id, updateServiceDto);
  }
}
