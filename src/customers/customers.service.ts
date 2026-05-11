import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { buildPaginationMeta } from '../common/pagination/pagination-meta';
import {
  buildOptionsResponse,
  buildQuickCreateResponse,
  type ReferenceOption,
} from '../common/reference-data';
import type { CreateCustomerDto } from './dto/create-customer.dto';
import type { CustomerOptionsQueryDto } from './dto/customer-options-query.dto';
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

  async findOptions(query: CustomerOptionsQueryDto) {
    const options = await this.customersRepository.findOptions(query);

    return buildOptionsResponse(options.map(mapCustomerOption), query.limit);
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

  async quickCreate(createCustomerDto: CreateCustomerDto) {
    const customer = await this.create(createCustomerDto);

    return buildQuickCreateResponse(mapCustomerOption(customer), customer);
  }

  private rethrowKnownError(error: unknown): never {
    if (error instanceof CustomerDuplicateDocumentError) {
      throw new ConflictException('Customer document already exists');
    }

    throw error;
  }
}

function mapCustomerOption(customer: {
  id: string;
  name: string;
  phone: string;
  documentType: string;
  documentNumber: string;
  email?: string | null;
}): ReferenceOption {
  return {
    id: customer.id,
    label: customer.name,
    description: `${customer.documentType} ${customer.documentNumber}`,
    context: {
      phone: customer.phone,
      email: customer.email ?? null,
    },
  };
}
