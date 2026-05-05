import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CustomersController } from './customers.controller';
import {
  CUSTOMERS_PRISMA_CLIENT,
  CustomersRepository,
} from './persistence/customers.repository';
import { CustomersService } from './customers.service';

@Module({
  controllers: [CustomersController],
  providers: [
    CustomersService,
    CustomersRepository,
    PrismaService,
    {
      provide: CUSTOMERS_PRISMA_CLIENT,
      useExisting: PrismaService,
    },
  ],
})
export class CustomersModule {}
