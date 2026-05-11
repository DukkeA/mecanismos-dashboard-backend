import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { PricingLaborSettingsResponseDto } from './dto/pricing-labor-settings.response.dto';
import { UpdatePricingLaborSettingsDto } from './dto/update-pricing-labor-settings.dto';
import { AppSettingsService } from './app-settings.service';

@ApiTags('app-settings')
@ApiCookieAuth('md_access')
@Controller('app-settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SALES')
export class AppSettingsController {
  constructor(private readonly appSettingsService: AppSettingsService) {}

  @Get('pricing-labor')
  @ApiOperation({ summary: 'Read the current singleton pricing and labor settings' })
  @ApiOkResponse({
    description: 'Current pricing/labor settings returned.',
    type: PricingLaborSettingsResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN | SALES' })
  getCurrentPricingLaborSettings() {
    return this.appSettingsService.getCurrentPricingLaborSettings();
  }

  @Patch('pricing-labor')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update the current singleton pricing and labor settings' })
  @ApiOkResponse({
    description: 'Pricing/labor settings updated.',
    type: PricingLaborSettingsResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN' })
  updateCurrentPricingLaborSettings(
    @Body() dto: UpdatePricingLaborSettingsDto,
  ) {
    return this.appSettingsService.updateCurrentPricingLaborSettings(dto);
  }
}
