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
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateEmployeeBonusDto } from './dto/create-employee-bonus.dto';
import { EmployeeOptionsQueryDto } from './dto/employee-options-query.dto';
import { ListEmployeeBonusesQueryDto } from './dto/list-employee-bonuses-query.dto';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { ListEmployeesQueryDto } from './dto/list-employees-query.dto';
import { QuickCreateEmployeeDto } from './dto/quick-create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeesService } from './employees.service';

@ApiTags('employees')
@ApiCookieAuth('md_access')
@Controller('employees')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SALES')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  @ApiOperation({
    summary: 'Create an employee with optional cost-center ownership reference',
  })
  @ApiCreatedResponse({ description: 'Employee created.' })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  @ApiNotFoundResponse({ description: 'Referenced cost center not found.' })
  create(@Body() createEmployeeDto: CreateEmployeeDto) {
    return this.employeesService.create(createEmployeeDto);
  }

  @Get()
  @ApiOperation({
    summary: 'List employees with pragmatic pagination and lifecycle filters',
  })
  @ApiOkResponse({ description: 'Paginated employee list returned.' })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  findAll(@Query() query: ListEmployeesQueryDto) {
    return this.employeesService.findAll(query);
  }

  @Get('options')
  @ApiOperation({
    summary: 'List lightweight employee options for frontend comboboxes',
  })
  @ApiOkResponse({
    description: 'Employee options returned.',
    type: ReferenceOptionsResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  findOptions(@Query() query: EmployeeOptionsQueryDto) {
    return this.employeesService.findOptions(query);
  }

  @Get('cost-center-options')
  @ApiOperation({
    summary: 'List read-only cost-center options for employee forms',
  })
  @ApiOkResponse({ description: 'Cost-center options returned.' })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  listCostCenterOptions() {
    return this.employeesService.listCostCenterOptions();
  }

  @Post('quick-create')
  @ApiOperation({
    summary:
      'Quick-create an employee with salary default 0 and incomplete-profile semantics when omitted',
  })
  @ApiCreatedResponse({
    description: 'Employee quick-created.',
    type: QuickCreateResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  @ApiNotFoundResponse({ description: 'Referenced cost center not found.' })
  createQuick(@Body() createEmployeeDto: QuickCreateEmployeeDto) {
    return this.employeesService.quickCreate(createEmployeeDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an employee by id' })
  @ApiOkResponse({ description: 'Employee returned.' })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  @ApiNotFoundResponse({ description: 'Employee not found.' })
  findOne(@Param('id') id: string) {
    return this.employeesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update employee catalog fields and toggle active lifecycle state',
  })
  @ApiOkResponse({ description: 'Employee updated.' })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  @ApiNotFoundResponse({
    description: 'Employee not found or referenced cost center not found.',
  })
  update(
    @Param('id') id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
  ) {
    return this.employeesService.update(id, updateEmployeeDto);
  }

  @Post(':id/bonuses')
  @ApiOperation({ summary: 'Create a manual bonus owned by an employee' })
  @ApiCreatedResponse({ description: 'Employee bonus created.' })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  @ApiNotFoundResponse({ description: 'Employee not found.' })
  createBonus(
    @Param('id') id: string,
    @Body() createEmployeeBonusDto: CreateEmployeeBonusDto,
  ) {
    return this.employeesService.createBonus(id, createEmployeeBonusDto);
  }

  @Get(':id/bonuses')
  @ApiOperation({
    summary: 'List employee-owned bonuses ordered by paid date desc',
  })
  @ApiOkResponse({ description: 'Paginated employee bonus list returned.' })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  @ApiNotFoundResponse({ description: 'Employee not found.' })
  findBonuses(
    @Param('id') id: string,
    @Query() query: ListEmployeeBonusesQueryDto,
  ) {
    return this.employeesService.findBonuses(id, query);
  }
}
