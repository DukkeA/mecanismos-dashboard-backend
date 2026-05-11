import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PrismaModule } from '../prisma/prisma.module';
import { EmployeeMonthlyPayrollController } from './employee-monthly-payroll.controller';
import { EmployeeMonthlyPayrollService } from './employee-monthly-payroll.service';
import {
  EMPLOYEE_MONTHLY_PAYROLL_PRISMA_CLIENT,
  EmployeeMonthlyPayrollRepository,
} from './employee-monthly-payroll.repository';

@Module({
  imports: [PrismaModule],
  controllers: [EmployeeMonthlyPayrollController],
  providers: [
    EmployeeMonthlyPayrollService,
    EmployeeMonthlyPayrollRepository,
    {
      provide: EMPLOYEE_MONTHLY_PAYROLL_PRISMA_CLIENT,
      useExisting: PrismaService,
    },
  ],
})
export class EmployeeMonthlyPayrollModule {}
