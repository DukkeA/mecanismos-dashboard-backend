import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CreateSupplierDto } from './dto/create-supplier.dto';
import type { ListSuppliersQueryDto } from './dto/list-suppliers-query.dto';
import type { SupplierPhoneDto } from './dto/supplier-phone.dto';
import type { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SuppliersRepository } from './persistence/suppliers.repository';

@Injectable()
export class SuppliersService {
  constructor(private readonly suppliersRepository: SuppliersRepository) {}

  async create(createSupplierDto: CreateSupplierDto) {
    return this.suppliersRepository.create({
      ...createSupplierDto,
      phones: normalizeSupplierPhones(createSupplierDto.phones),
    });
  }

  async findAll(query: ListSuppliersQueryDto) {
    const result = await this.suppliersRepository.findMany(query);

    return {
      data: result.items,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit),
      },
    };
  }

  async findOne(id: string) {
    const supplier = await this.suppliersRepository.findById(id);

    if (!supplier) {
      throw new NotFoundException(`Supplier ${id} not found`);
    }

    return supplier;
  }

  async update(id: string, updateSupplierDto: UpdateSupplierDto) {
    await this.findOne(id);

    return this.suppliersRepository.update(id, {
      ...updateSupplierDto,
      ...(updateSupplierDto.phones !== undefined
        ? { phones: normalizeSupplierPhones(updateSupplierDto.phones) }
        : {}),
    });
  }
}

function normalizeSupplierPhones(phones: SupplierPhoneDto[]) {
  if (phones.length === 0) {
    throw new BadRequestException('Suppliers require at least one phone');
  }

  const primaryPhones = phones.filter((phone) => phone.isPrimary);

  if (primaryPhones.length > 1) {
    throw new BadRequestException(
      'Suppliers require exactly one primary phone',
    );
  }

  if (primaryPhones.length === 0) {
    return phones.map((phone, index) => ({
      ...phone,
      isPrimary: index === 0,
    }));
  }

  return phones.map((phone) => ({
    ...phone,
    isPrimary: primaryPhones[0] === phone,
  }));
}
