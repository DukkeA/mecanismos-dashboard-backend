import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiCreatedResponse, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ReferenceOptionsResponseDto } from '../common/reference-data';
import { BrandsService } from './brands.service';
import { BrandOptionsQueryDto } from './dto/brand-options-query.dto';
import { CreateBrandDto } from './dto/create-brand.dto';
import { ListBrandsQueryDto } from './dto/list-brands-query.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

@ApiTags('brands')
@ApiCookieAuth('md_access')
@Controller('brands')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SALES')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Post()
  @ApiOperation({ summary: 'Create or reuse a normalized brand' })
  @ApiCreatedResponse({ description: 'Brand created or reused.' })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  create(@Body() dto: CreateBrandDto) { return this.brandsService.create(dto); }

  @Get()
  @ApiOperation({ summary: 'List brands for combobox usage' })
  @ApiOkResponse({ description: 'Paginated brand list returned.' })
  findAll(@Query() query: ListBrandsQueryDto) { return this.brandsService.findAll(query); }

  @Get('options')
  @ApiOperation({ summary: 'List lightweight brand options for frontend comboboxes' })
  @ApiOkResponse({ description: 'Brand options returned.', type: ReferenceOptionsResponseDto })
  findOptions(@Query() query: BrandOptionsQueryDto) { return this.brandsService.findOptions(query); }

  @Get(':id')
  @ApiOperation({ summary: 'Get a brand by id' })
  findOne(@Param('id') id: string) { return this.brandsService.findOne(id); }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a brand' })
  update(@Param('id') id: string, @Body() dto: UpdateBrandDto) { return this.brandsService.update(id, dto); }
}
