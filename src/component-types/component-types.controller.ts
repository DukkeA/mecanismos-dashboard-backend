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
import { ComponentTypesService } from './component-types.service';
import { CreateComponentTypeDto } from './dto/create-component-type.dto';
import { ListComponentTypesQueryDto } from './dto/list-component-types-query.dto';
import { UpdateComponentTypeDto } from './dto/update-component-type.dto';

@ApiTags('component-types')
@ApiCookieAuth('md_access')
@Controller('component-types')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SALES')
export class ComponentTypesController {
  constructor(private readonly componentTypesService: ComponentTypesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a normalized component type' })
  @ApiCreatedResponse({ description: 'Component type created.' })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  create(@Body() createComponentTypeDto: CreateComponentTypeDto) {
    return this.componentTypesService.create(createComponentTypeDto);
  }

  @Get()
  @ApiOperation({ summary: 'List component types for combobox usage' })
  @ApiOkResponse({ description: 'Paginated component type list returned.' })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  findAll(@Query() query: ListComponentTypesQueryDto) {
    return this.componentTypesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a component type by id' })
  @ApiOkResponse({ description: 'Component type returned.' })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  findOne(@Param('id') id: string) {
    return this.componentTypesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a component type' })
  @ApiOkResponse({ description: 'Component type updated.' })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  update(
    @Param('id') id: string,
    @Body() updateComponentTypeDto: UpdateComponentTypeDto,
  ) {
    return this.componentTypesService.update(id, updateComponentTypeDto);
  }
}
