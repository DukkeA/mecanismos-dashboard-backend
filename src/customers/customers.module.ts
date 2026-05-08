import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CustomersController } from './customers.controller';
import {
  CUSTOMERS_PRISMA_CLIENT,
  CustomersRepository,
} from './persistence/customers.repository';
import { CustomersService } from './customers.service';

@Module({
  imports: [PrismaModule],
  controllers: [CustomersController],
  providers: [
    CustomersService,
    CustomersRepository,
    {
      provide: CUSTOMERS_PRISMA_CLIENT,
      useExisting: PrismaService,
    },
  ],
})
export class CustomersModule {}
