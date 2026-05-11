import { BadRequestException, Injectable } from '@nestjs/common';
import { AppSettingsRepository } from './app-settings.repository';
import {
  buildPricingLaborSettingsDiff,
  isEmptyPricingLaborSettingsPatch,
  type PricingLaborAuditHistoryPage,
} from './app-settings.contract';
import type { UpdatePricingLaborSettingsDto } from './dto/update-pricing-labor-settings.dto';

@Injectable()
export class AppSettingsService {
  constructor(private readonly appSettingsRepository: AppSettingsRepository) {}

  getCurrentPricingLaborSettings() {
    return this.appSettingsRepository.getOrCreateCurrent();
  }

  async updateCurrentPricingLaborSettings(
    dto: UpdatePricingLaborSettingsDto,
    actorUserId: string,
  ) {
    if (isEmptyPricingLaborSettingsPatch(dto)) {
      throw new BadRequestException(
        'At least one pricing/labor field must be provided.',
      );
    }

    const current = await this.appSettingsRepository.getOrCreateCurrent();
    const diff = buildPricingLaborSettingsDiff(current, dto);

    if (diff.changedFields.length === 0) {
      throw new BadRequestException(
        'At least one pricing/labor field must change.',
      );
    }

    return this.appSettingsRepository.updateCurrentWithAudit({
      actorUserId,
      dto: diff.updatedValues,
      changedFields: diff.changedFields,
      beforeValues: diff.beforeValues,
      afterValues: diff.afterValues,
    });
  }

  async getPricingLaborSettingsHistory({
    page,
    limit,
  }: {
    page: number;
    limit: number;
  }): Promise<PricingLaborAuditHistoryPage> {
    const [data, total] = await Promise.all([
      this.appSettingsRepository.findPricingLaborHistory({ page, limit }),
      this.appSettingsRepository.countPricingLaborHistory(),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
      },
    };
  }
}
