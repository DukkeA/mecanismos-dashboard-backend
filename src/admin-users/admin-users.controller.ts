import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthJwtPayload } from '../auth/auth.jwt';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AdminUsersService } from './admin-users.service';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import {
  AdminUserResponseDto,
  AdminUserWithTemporaryPasswordDto,
} from './dto/admin-user-response.dto';
import { ListAdminUsersQueryDto } from './dto/list-admin-users-query.dto';
import { ResetAdminUserPasswordDto } from './dto/reset-admin-user-password.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';

@ApiTags('admin-users')
@ApiCookieAuth('md_access')
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  @ApiOperation({ summary: 'List login users with admin-only filters' })
  @ApiOkResponse({ description: 'Paginated admin user list returned.' })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN' })
  findAll(@Query() query: ListAdminUsersQueryDto) {
    return this.adminUsersService.findAll(query);
  }

  @Post()
  @ApiOperation({
    summary: 'Create an admin-managed login user with a temporary password',
  })
  @ApiCreatedResponse({
    description: 'Managed user created.',
    type: AdminUserWithTemporaryPasswordDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN' })
  @ApiConflictResponse({ description: 'User email already exists.' })
  create(@CurrentUser() user: AuthJwtPayload, @Body() dto: CreateAdminUserDto) {
    return this.adminUsersService.create(user.sub, dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a managed user name, role, or active state',
  })
  @ApiOkResponse({
    description: 'Managed user updated.',
    type: AdminUserResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN' })
  update(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateAdminUserDto,
  ) {
    return this.adminUsersService.update(user.sub, id, dto);
  }

  @Post(':id/reset-password')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Reset a managed user password and force a change on next login',
  })
  @ApiOkResponse({
    description: 'Managed user password reset.',
    type: AdminUserWithTemporaryPasswordDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token missing or invalid.' })
  @ApiForbiddenResponse({ description: 'Allowed roles: ADMIN' })
  resetPassword(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id') id: string,
    @Body() dto: ResetAdminUserPasswordDto,
  ) {
    return this.adminUsersService.resetPassword(user.sub, id, dto);
  }
}
