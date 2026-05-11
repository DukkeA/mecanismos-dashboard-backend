import { Injectable } from '@nestjs/common';
import { AppSettingsRepository } from './app-settings.repository';
import type { UpdatePricingLaborSettingsDto } from './dto/update-pricing-labor-settings.dto';

@Injectable()
export class AppSettingsService {
  constructor(
    private readonly appSettingsRepository: AppSettingsRepository,
  ) {}

  getCurrentPricingLaborSettings() {
    return this.appSettingsRepository.getOrCreateCurrent();
  }

  async updateCurrentPricingLaborSettings(
    dto: UpdatePricingLaborSettingsDto,
  ) {
    await this.appSettingsRepository.getOrCreateCurrent();

    return this.appSettingsRepository.updateCurrent(dto);
  }
}
