import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import {
  EmployeeMonthlyPayrollDetailResponseDto,
  EmployeeMonthlyPayrollListResponseDto,
} from './dto/employee-monthly-payroll-response.dto';
import { GenerateEmployeeMonthlyPayrollDto } from './dto/generate-employee-monthly-payroll.dto';
import { ListEmployeeMonthlyPayrollQueryDto } from './dto/list-employee-monthly-payroll-query.dto';
import { EmployeeMonthlyPayrollService } from './employee-monthly-payroll.service';

@ApiTags('employee-monthly-payroll')
@ApiCookieAuth('md_access')
@Controller('employee-monthly-payroll')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SALES')
export class EmployeeMonthlyPayrollController {
  constructor(
    private readonly employeeMonthlyPayrollService: EmployeeMonthlyPayrollService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List monthly payroll periods with summary totals' })
  @ApiOkResponse({
    description: 'Monthly payroll periods returned.',
    type: EmployeeMonthlyPayrollListResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  findAll(@Query() query: ListEmployeeMonthlyPayrollQueryDto) {
    return this.employeeMonthlyPayrollService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a monthly payroll period with snapshot lines' })
  @ApiOkResponse({
    description: 'Monthly payroll detail returned.',
    type: EmployeeMonthlyPayrollDetailResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  @ApiNotFoundResponse({ description: 'Employee monthly payroll not found.' })
  findOne(@Param('id') id: string) {
    return this.employeeMonthlyPayrollService.findOne(id);
  }

  @Post('generate')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Generate or refresh a draft monthly payroll period' })
  @ApiCreatedResponse({
    description: 'Monthly payroll draft generated.',
    type: EmployeeMonthlyPayrollDetailResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN' })
  generate(@Body() dto: GenerateEmployeeMonthlyPayrollDto) {
    return this.employeeMonthlyPayrollService.generate(dto);
  }

  @Post(':id/finalize')
  @HttpCode(200)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Finalize a draft monthly payroll period' })
  @ApiOkResponse({
    description: 'Monthly payroll finalized.',
    type: EmployeeMonthlyPayrollDetailResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN' })
  @ApiNotFoundResponse({ description: 'Employee monthly payroll not found.' })
  finalize(@Param('id') id: string) {
    return this.employeeMonthlyPayrollService.finalize(id);
  }
}
