import {
  Get,
  Body,
  Controller,
  HttpCode,
  Inject,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import type { AuthUserPayload } from './auth.service';
import { clearAuthCookies, setAuthCookies } from './auth.cookies';
import { AuthOriginGuard } from './auth-origin.guard';
import { CurrentUser } from './current-user.decorator';
import type { AuthJwtPayload } from './auth.jwt';
import { AUTH_RUNTIME_CONFIG } from './config/auth.config';
import type { AuthRuntimeConfig } from './config/auth.config';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import {
  GenerateRecoveryPhraseDto,
  GenerateRecoveryPhraseResponseDto,
  RecoverWithPhraseDto,
  RecoveryPhraseStatusDto,
} from './dto/recovery-phrase.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @Inject(AUTH_RUNTIME_CONFIG)
    private readonly authConfig: AuthRuntimeConfig,
  ) {}

  @Post('login')
  @HttpCode(200)
  @UseGuards(AuthOriginGuard)
  @ApiOperation({ summary: 'Authenticate with email and password' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({
    description: 'Authenticated user returned and auth cookies issued.',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password.' })
  async login(
    @Body() loginDto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthUserPayload> {
    const result = await this.authService.login(loginDto, {
      ipAddress: request.ip,
      userAgent: request.get('user-agent') ?? undefined,
    });

    setAuthCookies(response, this.authConfig, result);

    return result.user;
  }

  @Post('refresh')
  @HttpCode(200)
  @UseGuards(AuthOriginGuard)
  @ApiOperation({ summary: 'Rotate refresh token and reissue auth cookies' })
  @ApiOkResponse({
    description: 'Authenticated user returned and auth cookies reissued.',
  })
  @ApiUnauthorizedResponse({
    description: 'Refresh token missing, invalid, or reused.',
  })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthUserPayload> {
    const refreshToken = request.cookies?.[
      this.authConfig.refreshTokenCookie.name
    ] as string | undefined;

    const result = await this.authService.refresh(refreshToken, {
      ipAddress: request.ip,
      userAgent: request.get('user-agent') ?? undefined,
    });

    setAuthCookies(response, this.authConfig, result);

    return result.user;
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(AuthOriginGuard)
  @ApiOperation({
    summary: 'Revoke the current refresh session and clear auth cookies',
  })
  @ApiOkResponse({ description: 'Auth cookies cleared.' })
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ success: true }> {
    const refreshToken = request.cookies?.[
      this.authConfig.refreshTokenCookie.name
    ] as string | undefined;

    await this.authService.logout(refreshToken);
    clearAuthCookies(response, this.authConfig);

    return { success: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('md_access')
  @ApiOperation({ summary: 'Return the authenticated current user' })
  @ApiOkResponse({ description: 'Authenticated user returned.' })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  me(@CurrentUser() user: AuthJwtPayload): Promise<AuthUserPayload> {
    return this.authService.getCurrentUser(user.sub);
  }

  @Get('admin/smoke')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiCookieAuth('md_access')
  @ApiOperation({
    summary: 'Verify that the authenticated user has admin access',
  })
  @ApiOkResponse({ description: 'Admin access confirmed.' })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Admin role required.' })
  adminSmoke(@CurrentUser() user: AuthJwtPayload): {
    success: true;
    role: 'ADMIN' | 'SALES' | 'MECHANIC';
  } {
    return {
      success: true,
      role: user.role,
    };
  }

  @Post('change-password')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('md_access')
  @ApiOperation({ summary: 'Change the authenticated user password' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiOkResponse({ description: 'Authenticated user password changed.' })
  @ApiUnauthorizedResponse({
    description:
      'Access token missing, invalid, or current password incorrect.',
  })
  changePassword(
    @CurrentUser() user: AuthJwtPayload,
    @Body() dto: ChangePasswordDto,
  ): Promise<AuthUserPayload> {
    return this.authService.changePassword(user.sub, dto);
  }

  @Get('recovery-phrase/status')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('md_access')
  @ApiOperation({ summary: 'Return recovery phrase status metadata' })
  @ApiOkResponse({
    type: RecoveryPhraseStatusDto,
    description: 'Recovery phrase metadata returned without plaintext or hash.',
  })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  getRecoveryPhraseStatus(
    @CurrentUser() user: AuthJwtPayload,
  ): Promise<RecoveryPhraseStatusDto> {
    return this.authService.getRecoveryPhraseStatus(user.sub);
  }

  @Post('recovery-phrase/generate')
  @HttpCode(200)
  @UseGuards(AuthOriginGuard, JwtAuthGuard)
  @ApiCookieAuth('md_access')
  @ApiOperation({
    summary: 'Generate or rotate the authenticated user recovery phrase',
  })
  @ApiBody({ type: GenerateRecoveryPhraseDto })
  @ApiOkResponse({
    type: GenerateRecoveryPhraseResponseDto,
    description: 'Plaintext recovery phrase returned exactly once.',
  })
  @ApiUnauthorizedResponse({
    description:
      'Access token missing, invalid, or current password incorrect.',
  })
  generateRecoveryPhrase(
    @CurrentUser() user: AuthJwtPayload,
    @Body() dto: GenerateRecoveryPhraseDto,
  ): Promise<GenerateRecoveryPhraseResponseDto> {
    return this.authService.generateRecoveryPhrase(user.sub, dto);
  }

  @Post('recovery-phrase/recover')
  @HttpCode(200)
  @UseGuards(AuthOriginGuard)
  @ApiOperation({ summary: 'Recover an account with a recovery phrase' })
  @ApiBody({ type: RecoverWithPhraseDto })
  @ApiOkResponse({
    description: 'Password recovered and refresh sessions revoked.',
  })
  @ApiUnauthorizedResponse({ description: 'Recovery failed.' })
  @ApiTooManyRequestsResponse({ description: 'Too many recovery attempts.' })
  recoverWithPhrase(
    @Req() request: Request,
    @Body() dto: RecoverWithPhraseDto,
  ): Promise<{ success: true }> {
    return this.authService.recoverWithPhrase(dto, {
      ipAddress: request.ip,
      userAgent: request.get('user-agent') ?? undefined,
    });
  }
}
