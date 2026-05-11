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
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ComponentsService } from './components.service';
import { ComponentOptionsQueryDto } from './dto/component-options-query.dto';
import { CreateComponentDto } from './dto/create-component.dto';
import { ListComponentsQueryDto } from './dto/list-components-query.dto';
import { UpdateComponentDto } from './dto/update-component.dto';

@ApiTags('components')
@ApiCookieAuth('md_access')
@Controller('components')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SALES')
export class ComponentsController {
  constructor(private readonly componentsService: ComponentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a customer-owned component' })
  @ApiCreatedResponse({ description: 'Component created.' })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  create(@Body() createComponentDto: CreateComponentDto) {
    return this.componentsService.create(createComponentDto);
  }

  @Get()
  @ApiOperation({ summary: 'List components with pragmatic pagination/search' })
  @ApiOkResponse({ description: 'Paginated component list returned.' })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  findAll(@Query() query: ListComponentsQueryDto) {
    return this.componentsService.findAll(query);
  }

  @Get('options')
  @ApiOperation({
    summary:
      'List lightweight component options with customer and vehicle filters',
  })
  @ApiOkResponse({
    description: 'Component options returned.',
    type: ReferenceOptionsResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  findOptions(@Query() query: ComponentOptionsQueryDto) {
    return this.componentsService.findOptions(query);
  }

  @Post('quick-create')
  @ApiOperation({
    summary: 'Quick-create a component and return an option-compatible result',
  })
  @ApiCreatedResponse({
    description: 'Component quick-created.',
    type: QuickCreateResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  createQuick(@Body() createComponentDto: CreateComponentDto) {
    return this.componentsService.quickCreate(createComponentDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a component by id' })
  @ApiOkResponse({ description: 'Component returned.' })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  findOne(@Param('id') id: string) {
    return this.componentsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary:
      'Update a component without changing customer ownership and with same-customer vehicle guards',
  })
  @ApiOkResponse({ description: 'Component updated.' })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  update(
    @Param('id') id: string,
    @Body() updateComponentDto: UpdateComponentDto,
  ) {
    return this.componentsService.update(id, updateComponentDto);
  }
}
