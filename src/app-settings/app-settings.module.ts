import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma.service';
import { AppSettingsController } from './app-settings.controller';
import {
  APP_SETTINGS_PRISMA_CLIENT,
  AppSettingsRepository,
} from './app-settings.repository';
import { AppSettingsService } from './app-settings.service';

@Module({
  imports: [PrismaModule],
  controllers: [AppSettingsController],
  providers: [
    AppSettingsService,
    AppSettingsRepository,
    {
      provide: APP_SETTINGS_PRISMA_CLIENT,
      useExisting: PrismaService,
    },
  ],
  exports: [AppSettingsService],
})
export class AppSettingsModule {}
