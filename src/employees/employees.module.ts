import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PrismaModule } from '../prisma/prisma.module';
import { EmployeesController } from './employees.controller';
import {
  EMPLOYEES_PRISMA_CLIENT,
  EmployeesRepository,
} from './persistence/employees.repository';
import { EmployeesService } from './employees.service';

@Module({
  imports: [PrismaModule],
  controllers: [EmployeesController],
  providers: [
    EmployeesService,
    EmployeesRepository,
    {
      provide: EMPLOYEES_PRISMA_CLIENT,
      useExisting: PrismaService,
    },
  ],
})
export class EmployeesModule {}
