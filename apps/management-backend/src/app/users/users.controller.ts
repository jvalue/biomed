import { Body, Controller, Get, Logger, Param, Patch, Query, UseGuards } from '@nestjs/common';
import {
	ApiForbiddenResponse,
	ApiNotFoundResponse,
	ApiOkResponse,
	ApiOperation,
	ApiQuery,
	ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserPermission } from '../auth/enums/user-permission.enum';
import { UserStatus } from '../auth/enums/user-status.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserEntity } from './entity/user.entity';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
	private readonly logger = new Logger(UsersController.name);
	constructor(private readonly usersService: UsersService) {}

	@ApiOperation({ summary: 'Get all pending users' })
	@ApiOkResponse({ description: 'List of pending users retrieved successfully' })
	@ApiUnauthorizedResponse({ description: 'Unauthorized' })
	@ApiForbiddenResponse({ description: 'You do not have permission to read users' })
	@ApiQuery({ name: 'status', required: false, description: 'Filter users by status' })
	@Get()
	async getUsers(@CurrentUser() requestingUser: UserEntity, @Query('status') status?: UserStatus) {
		return this.usersService.findUsers(requestingUser, status);
	}

	@ApiOperation({ summary: 'Approve a user' })
	@ApiOkResponse({ description: 'User approved successfully' })
	@ApiNotFoundResponse({ description: 'User not found' })
	@ApiForbiddenResponse({ description: 'You do not have permission to approve users' })
	@Patch(':id/approve')
	async approveUser(@Param('id') userId: string, @CurrentUser() requestingUser: UserEntity) {
		this.logger.warn('approve user called on userId: ' + userId);
		return this.usersService.approveUser(userId, requestingUser);
	}

	@ApiOperation({ summary: 'Block a user' })
	@ApiOkResponse({ description: 'User blocked successfully' })
	@ApiNotFoundResponse({ description: 'User not found' })
	@ApiForbiddenResponse({ description: 'You do not have permission to block users' })
	@Patch(':id/block')
	async blockUser(@Param('id') userId: string, @CurrentUser() requestingUser: UserEntity) {
		this.logger.warn('blockUser called on userId: ' + userId);
		return this.usersService.blockUser(userId, requestingUser);
	}

	@ApiOperation({ summary: 'Update user permissions' })
	@ApiOkResponse({ description: 'User permissions updated successfully' })
	@ApiNotFoundResponse({ description: 'User not found' })
	@ApiForbiddenResponse({ description: 'You do not have permission to update user permissions' })
	@Patch(':id/permissions')
	async updatePermissions(
		@Param('id') userId: string,
		@CurrentUser() requestingUser: UserEntity,
		@Body() body: { permissions: UserPermission[] },
	) {
		return this.usersService.updatePermissions(userId, body.permissions, requestingUser);
	}
}
