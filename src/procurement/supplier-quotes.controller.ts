import {
  Body,
  Controller,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
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
import { CreateSupplierQuoteDto } from './dto/create-supplier-quote.dto';
import { UpdateSupplierQuoteDto } from './dto/update-supplier-quote.dto';
import { VoidSupplierQuoteDto } from './dto/void-supplier-quote.dto';
import { ProcurementService } from './procurement.service';

@ApiTags('procurement')
@ApiCookieAuth('md_access')
@Controller('/')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SALES')
export class SupplierQuotesController {
  constructor(private readonly procurementService: ProcurementService) {}

  @Post('supplier-quotes')
  @ApiOperation({
    summary: 'Append a new supplier quote event for one item and supplier',
  })
  @ApiCreatedResponse({ description: 'Supplier quote event created.' })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  @ApiNotFoundResponse({ description: 'Supplier or inventory item not found.' })
  create(@Body() createSupplierQuoteDto: CreateSupplierQuoteDto) {
    return this.procurementService.createQuote(createSupplierQuoteDto);
  }

  @Patch('supplier-quotes/:id')
  @ApiOperation({
    summary: 'Correct quote metadata or typo fields without rewriting history',
  })
  @ApiOkResponse({ description: 'Supplier quote corrected.' })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  @ApiNotFoundResponse({ description: 'Supplier quote not found.' })
  update(
    @Param('id') id: string,
    @Body() updateSupplierQuoteDto: UpdateSupplierQuoteDto,
  ) {
    return this.procurementService.updateQuote(id, updateSupplierQuoteDto);
  }

  @Patch('supplier-quotes/:id/void')
  @ApiOperation({
    summary: 'Void a supplier quote while preserving audit history',
  })
  @ApiOkResponse({ description: 'Supplier quote voided.' })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  @ApiNotFoundResponse({ description: 'Supplier quote not found.' })
  voidQuote(
    @Param('id') id: string,
    @Body() voidSupplierQuoteDto: VoidSupplierQuoteDto,
  ) {
    return this.procurementService.voidQuote(id, voidSupplierQuoteDto);
  }
}
