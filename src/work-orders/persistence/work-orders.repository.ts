import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

export const WORK_ORDERS_PRISMA_CLIENT = Symbol('WORK_ORDERS_PRISMA_CLIENT');

@Injectable()
export class WorkOrdersRepository {
  constructor(
    @Inject(WORK_ORDERS_PRISMA_CLIENT)
    readonly prisma: PrismaService,
  ) {}
}
