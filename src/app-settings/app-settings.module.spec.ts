import 'reflect-metadata';
import { MODULE_METADATA } from '@nestjs/common/constants';
jest.mock('../prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma.service';
import { AppSettingsController } from './app-settings.controller';
import {
  APP_SETTINGS_PRISMA_CLIENT,
  AppSettingsRepository,
} from './app-settings.repository';
import { AppSettingsModule } from './app-settings.module';
import { AppSettingsService } from './app-settings.service';

describe('AppSettingsModule', () => {
  it('imports PrismaModule and exports the settings service for work-order consumers', () => {
    const imports = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      AppSettingsModule,
    ) as unknown[];
    const controllers = Reflect.getMetadata(
      MODULE_METADATA.CONTROLLERS,
      AppSettingsModule,
    ) as unknown[];
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      AppSettingsModule,
    ) as Array<unknown>;
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      AppSettingsModule,
    ) as unknown[];

    expect(imports).toEqual(expect.arrayContaining([PrismaModule]));
    expect(controllers).toEqual(expect.arrayContaining([AppSettingsController]));
    expect(providers).toEqual(
      expect.arrayContaining([
        AppSettingsService,
        AppSettingsRepository,
        expect.objectContaining({
          provide: APP_SETTINGS_PRISMA_CLIENT,
          useExisting: PrismaService,
        }),
      ]),
    );
    expect(exportsMetadata).toEqual(
      expect.arrayContaining([AppSettingsService]),
    );
  });
});
