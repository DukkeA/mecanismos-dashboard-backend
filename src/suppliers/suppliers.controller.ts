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
  ApiUnauthorizedResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { ListSuppliersQueryDto } from './dto/list-suppliers-query.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SuppliersService } from './suppliers.service';

@ApiTags('suppliers')
@ApiCookieAuth('md_access')
@Controller('suppliers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SALES')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a supplier' })
  @ApiCreatedResponse({ description: 'Supplier created.' })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  create(@Body() createSupplierDto: CreateSupplierDto) {
    return this.suppliersService.create(createSupplierDto);
  }

  @Get()
  @ApiOperation({ summary: 'List suppliers with pragmatic pagination/search' })
  @ApiOkResponse({ description: 'Paginated supplier list returned.' })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  findAll(@Query() query: ListSuppliersQueryDto) {
    return this.suppliersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a supplier by id' })
  @ApiOkResponse({ description: 'Supplier returned.' })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  findOne(@Param('id') id: string) {
    return this.suppliersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a supplier' })
  @ApiOkResponse({ description: 'Supplier updated.' })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  update(
    @Param('id') id: string,
    @Body() updateSupplierDto: UpdateSupplierDto,
  ) {
    return this.suppliersService.update(id, updateSupplierDto);
  }
}
