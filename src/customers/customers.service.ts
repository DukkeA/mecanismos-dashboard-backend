import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { buildPaginationMeta } from '../common/pagination/pagination-meta';
import type { CreateCustomerDto } from './dto/create-customer.dto';
import type { ListCustomersQueryDto } from './dto/list-customers-query.dto';
import type { UpdateCustomerDto } from './dto/update-customer.dto';
import {
  CustomerDuplicateDocumentError,
  CustomersRepository,
} from './persistence/customers.repository';

@Injectable()
export class CustomersService {
  constructor(private readonly customersRepository: CustomersRepository) {}

  async create(createCustomerDto: CreateCustomerDto) {
    try {
      return await this.customersRepository.create(createCustomerDto);
    } catch (error) {
      this.rethrowKnownError(error);
    }
  }

  async findAll(query: ListCustomersQueryDto) {
    const result = await this.customersRepository.findMany(query);

    return {
      data: result.items,
      meta: buildPaginationMeta(result),
    };
  }

  async findOne(id: string) {
    const customer = await this.customersRepository.findById(id);

    if (!customer) {
      throw new NotFoundException(`Customer ${id} not found`);
    }

    return customer;
  }

  async update(id: string, updateCustomerDto: UpdateCustomerDto) {
    await this.findOne(id);

    try {
      return await this.customersRepository.update(id, updateCustomerDto);
    } catch (error) {
      this.rethrowKnownError(error);
    }
  }

  private rethrowKnownError(error: unknown): never {
    if (error instanceof CustomerDuplicateDocumentError) {
      throw new ConflictException('Customer document already exists');
    }

    throw error;
  }
}
