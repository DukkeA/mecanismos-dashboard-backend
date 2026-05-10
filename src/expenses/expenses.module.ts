import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ExpensesService } from './expenses.service';
import { ExpensesController } from './expenses.controller';
import {
  EXPENSES_PRISMA_CLIENT,
  ExpensesRepository,
} from './persistence/expenses.repository';

@Module({
  imports: [PrismaModule],
  providers: [
    ExpensesService,
    ExpensesRepository,
    {
      provide: EXPENSES_PRISMA_CLIENT,
      useExisting: PrismaService,
    },
  ],
  controllers: [ExpensesController],
})
export class ExpensesModule {}
