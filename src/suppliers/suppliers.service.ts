import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { buildPaginationMeta } from '../common/pagination/pagination-meta';
import {
  buildOptionsResponse,
  buildQuickCreateResponse,
  type ReferenceOption,
} from '../common/reference-data';
import type { CreateSupplierDto } from './dto/create-supplier.dto';
import type { ListSuppliersQueryDto } from './dto/list-suppliers-query.dto';
import type { SupplierOptionsQueryDto } from './dto/supplier-options-query.dto';
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
      meta: buildPaginationMeta(result),
    };
  }

  async findOptions(query: SupplierOptionsQueryDto) {
    const options = await this.suppliersRepository.findOptions(query);

    return buildOptionsResponse(options.map(mapSupplierOption), query.limit);
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

  async quickCreate(createSupplierDto: CreateSupplierDto) {
    const supplier = await this.create(createSupplierDto);

    return buildQuickCreateResponse(mapSupplierOption(supplier), supplier);
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

function mapSupplierOption(supplier: {
  id: string;
  name: string;
  contactName?: string | null;
  email?: string | null;
  isActive: boolean;
  type: string;
  phones: Array<{ phone: string; isPrimary: boolean }>;
}): ReferenceOption {
  const primaryPhone =
    supplier.phones.find((phone) => phone.isPrimary)?.phone ??
    supplier.phones[0]?.phone ??
    null;

  return {
    id: supplier.id,
    label: supplier.name,
    description: supplier.contactName ?? undefined,
    isActive: supplier.isActive,
    context: {
      type: supplier.type,
      phone: primaryPhone,
      email: supplier.email ?? null,
    },
  };
}
