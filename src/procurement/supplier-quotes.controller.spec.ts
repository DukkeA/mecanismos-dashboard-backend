import { RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ROLES_KEY } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ProcurementService } from './procurement.service';
import { SupplierQuotesController } from './supplier-quotes.controller';

describe('SupplierQuotesController', () => {
  const service = {
    createQuote: jest.fn(),
    findSupplierQuoteTimeline: jest.fn(),
    updateQuote: jest.fn(),
    voidQuote: jest.fn(),
  } as unknown as jest.Mocked<ProcurementService>;

  it('registers append-only quote routes with guarded access', () => {
    const controller = new SupplierQuotesController(service);

    expect(controller).toBeDefined();
    expect(Reflect.getMetadata(PATH_METADATA, SupplierQuotesController)).toBe(
      '/',
    );
    expect(Reflect.getMetadata(ROLES_KEY, SupplierQuotesController)).toEqual([
      'ADMIN',
      'SALES',
    ]);
    expect(
      Reflect.getMetadata(GUARDS_METADATA, SupplierQuotesController),
    ).toEqual([JwtAuthGuard, RolesGuard]);

    const createHandler: unknown = Object.getOwnPropertyDescriptor(
      SupplierQuotesController.prototype,
      'create',
    )?.value;
    const voidHandler: unknown = Object.getOwnPropertyDescriptor(
      SupplierQuotesController.prototype,
      'voidQuote',
    )?.value;

    expect(Reflect.getMetadata(PATH_METADATA, createHandler as object)).toBe(
      'supplier-quotes',
    );
    expect(Reflect.getMetadata(METHOD_METADATA, createHandler as object)).toBe(
      RequestMethod.POST,
    );
    expect(Reflect.getMetadata(PATH_METADATA, voidHandler as object)).toBe(
      'supplier-quotes/:id/void',
    );
    expect(Reflect.getMetadata(METHOD_METADATA, voidHandler as object)).toBe(
      RequestMethod.PATCH,
    );
  });
});
