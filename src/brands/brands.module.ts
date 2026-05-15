import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PrismaModule } from '../prisma/prisma.module';
import { BrandsController } from './brands.controller';
import { BrandsService } from './brands.service';
import { BRANDS_PRISMA_CLIENT, BrandsRepository } from './persistence/brands.repository';

@Module({
  imports: [PrismaModule],
  controllers: [BrandsController],
  providers: [BrandsService, BrandsRepository, { provide: BRANDS_PRISMA_CLIENT, useExisting: PrismaService }],
})
export class BrandsModule {}
