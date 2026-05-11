import { RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { DECORATORS } from '@nestjs/swagger/dist/constants';
import { ROLES_KEY } from '../auth/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { AppSettingsController } from './app-settings.controller';
import { AppSettingsService } from './app-settings.service';
import { PricingLaborSettingsResponseDto } from './dto/pricing-labor-settings.response.dto';
import { UpdatePricingLaborSettingsDto } from './dto/update-pricing-labor-settings.dto';

function getControllerMethod(methodName: keyof AppSettingsController): object {
  const descriptor = Object.getOwnPropertyDescriptor(
    AppSettingsController.prototype,
    methodName,
  );

  expect(descriptor?.value).toBeDefined();

  return descriptor?.value as object;
}

type ApiResponseMetadata = Record<string, { type?: unknown }>;

describe('AppSettingsController', () => {
  const service = {
    getCurrentPricingLaborSettings: jest.fn(),
    updateCurrentPricingLaborSettings: jest.fn(),
  } as unknown as jest.Mocked<AppSettingsService>;

  let controller: AppSettingsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AppSettingsController(service);
  });

  it('registers protected pricing/labor settings routes with ADMIN-only patch overrides', async () => {
    const dto = {} as UpdatePricingLaborSettingsDto;

    service.getCurrentPricingLaborSettings.mockResolvedValue({
      currencyCode: 'COP',
    } as never);
    service.updateCurrentPricingLaborSettings.mockResolvedValue({
      currencyCode: 'USD',
    } as never);

    await expect(controller.getCurrentPricingLaborSettings()).resolves.toEqual({
      currencyCode: 'COP',
    });
    await expect(
      controller.updateCurrentPricingLaborSettings(dto),
    ).resolves.toEqual({ currencyCode: 'USD' });

    expect(Reflect.getMetadata(PATH_METADATA, AppSettingsController)).toBe(
      'app-settings',
    );
    expect(Reflect.getMetadata(ROLES_KEY, AppSettingsController)).toEqual([
      'ADMIN',
      'SALES',
    ]);
    expect(Reflect.getMetadata(GUARDS_METADATA, AppSettingsController)).toEqual(
      [JwtAuthGuard, RolesGuard],
    );

    const getHandler = getControllerMethod('getCurrentPricingLaborSettings');
    const patchHandler = getControllerMethod(
      'updateCurrentPricingLaborSettings',
    );

    expect(Reflect.getMetadata(PATH_METADATA, getHandler)).toBe(
      'pricing-labor',
    );
    expect(Reflect.getMetadata(METHOD_METADATA, getHandler)).toBe(
      RequestMethod.GET,
    );
    expect(Reflect.getMetadata(PATH_METADATA, patchHandler)).toBe(
      'pricing-labor',
    );
    expect(Reflect.getMetadata(METHOD_METADATA, patchHandler)).toBe(
      RequestMethod.PATCH,
    );
    expect(Reflect.getMetadata(ROLES_KEY, patchHandler)).toEqual(['ADMIN']);

    const getApiResponseMetadata = Reflect.getMetadata(
      DECORATORS.API_RESPONSE,
      getHandler,
    ) as ApiResponseMetadata | undefined;
    const patchApiResponseMetadata = Reflect.getMetadata(
      DECORATORS.API_RESPONSE,
      patchHandler,
    ) as ApiResponseMetadata | undefined;

    expect(getApiResponseMetadata?.['200']).toEqual(
      expect.objectContaining({
        type: PricingLaborSettingsResponseDto,
      }),
    );
    expect(patchApiResponseMetadata?.['200']).toEqual(
      expect.objectContaining({
        type: PricingLaborSettingsResponseDto,
      }),
    );
  });
});
