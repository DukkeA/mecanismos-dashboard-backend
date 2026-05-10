import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateWorkOrderActualCostDto } from './dto/create-work-order-actual-cost.dto';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { CreateWorkOrderPaymentDto } from './dto/create-work-order-payment.dto';
import { ListWorkOrdersQueryDto } from './dto/list-work-orders-query.dto';
import { UpdateWorkOrderActualCostDto } from './dto/update-work-order-actual-cost.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';
import { UpdateWorkOrderPaymentDto } from './dto/update-work-order-payment.dto';
import { UpsertWorkOrderEstimateDto } from './dto/upsert-work-order-estimate.dto';
import { WorkOrdersService } from './work-orders.service';

@ApiTags('work-orders')
@ApiCookieAuth('md_access')
@Controller('work-orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SALES')
export class WorkOrdersController {
  constructor(private readonly workOrdersService: WorkOrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a sale or workshop work order shell' })
  @ApiCreatedResponse({ description: 'Work order created.' })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  create(@Body() createWorkOrderDto: CreateWorkOrderDto) {
    return this.workOrdersService.create(createWorkOrderDto);
  }

  @Get()
  @ApiOperation({ summary: 'List work orders with lifecycle filters' })
  @ApiOkResponse({ description: 'Paginated work-order list returned.' })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  findAll(@Query() query: ListWorkOrdersQueryDto) {
    return this.workOrdersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a work order by id' })
  @ApiOkResponse({ description: 'Work order returned.' })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  findOne(@Param('id') id: string) {
    return this.workOrdersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update lifecycle and workshop-aware shell fields' })
  @ApiOkResponse({ description: 'Work order updated.' })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  update(@Param('id') id: string, @Body() updateWorkOrderDto: UpdateWorkOrderDto) {
    return this.workOrdersService.update(id, updateWorkOrderDto);
  }

  @Put(':id/estimates/:phase')
  @ApiOperation({ summary: 'Upsert an INITIAL or FINAL estimate shell' })
  @ApiOkResponse({ description: 'Estimate upserted.' })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  upsertEstimate(
    @Param('id') id: string,
    @Param('phase') phase: string,
    @Body() upsertWorkOrderEstimateDto: UpsertWorkOrderEstimateDto,
  ) {
    return this.workOrdersService.upsertEstimate(
      id,
      phase,
      upsertWorkOrderEstimateDto,
    );
  }

  @Get(':id/estimates')
  @ApiOperation({ summary: 'List estimate shells for a work order' })
  @ApiOkResponse({ description: 'Estimate list returned.' })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  findEstimates(@Param('id') id: string) {
    return this.workOrdersService.findEstimates(id);
  }

  @Post(':id/actual-costs')
  @ApiOperation({ summary: 'Create an actual-cost shell for a work order' })
  @ApiCreatedResponse({ description: 'Actual cost created.' })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  createActualCost(
    @Param('id') id: string,
    @Body() createWorkOrderActualCostDto: CreateWorkOrderActualCostDto,
  ) {
    return this.workOrdersService.createActualCost(
      id,
      createWorkOrderActualCostDto,
    );
  }

  @Get(':id/actual-costs')
  @ApiOperation({ summary: 'List actual-cost shells for a work order' })
  @ApiOkResponse({ description: 'Actual-cost list returned.' })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  findActualCosts(@Param('id') id: string) {
    return this.workOrdersService.findActualCosts(id);
  }

  @Patch(':id/actual-costs/:costId')
  @ApiOperation({ summary: 'Update an actual-cost shell for a work order' })
  @ApiOkResponse({ description: 'Actual cost updated.' })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  updateActualCost(
    @Param('id') id: string,
    @Param('costId') costId: string,
    @Body() updateWorkOrderActualCostDto: UpdateWorkOrderActualCostDto,
  ) {
    return this.workOrdersService.updateActualCost(
      id,
      costId,
      updateWorkOrderActualCostDto,
    );
  }

  @Delete(':id/actual-costs/:costId')
  @ApiOperation({ summary: 'Remove an actual-cost child without deleting the work order' })
  @ApiNoContentResponse({ description: 'Actual cost removed.' })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  removeActualCost(@Param('id') id: string, @Param('costId') costId: string) {
    return this.workOrdersService.removeActualCost(id, costId);
  }

  @Post(':id/payments')
  @ApiOperation({ summary: 'Create a payment shell for a work order' })
  @ApiCreatedResponse({ description: 'Payment created.' })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  createPayment(
    @Param('id') id: string,
    @Body() createWorkOrderPaymentDto: CreateWorkOrderPaymentDto,
  ) {
    return this.workOrdersService.createPayment(id, createWorkOrderPaymentDto);
  }

  @Get(':id/payments')
  @ApiOperation({ summary: 'List payment shells for a work order' })
  @ApiOkResponse({ description: 'Payment list returned.' })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  findPayments(@Param('id') id: string) {
    return this.workOrdersService.findPayments(id);
  }

  @Patch(':id/payments/:paymentId')
  @ApiOperation({ summary: 'Update a payment shell for a work order' })
  @ApiOkResponse({ description: 'Payment updated.' })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  updatePayment(
    @Param('id') id: string,
    @Param('paymentId') paymentId: string,
    @Body() updateWorkOrderPaymentDto: UpdateWorkOrderPaymentDto,
  ) {
    return this.workOrdersService.updatePayment(
      id,
      paymentId,
      updateWorkOrderPaymentDto,
    );
  }

  @Delete(':id/payments/:paymentId')
  @ApiOperation({ summary: 'Remove a payment child without deleting the work order' })
  @ApiNoContentResponse({ description: 'Payment removed.' })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  removePayment(
    @Param('id') id: string,
    @Param('paymentId') paymentId: string,
  ) {
    return this.workOrdersService.removePayment(id, paymentId);
  }
}
