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
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { UserPermission } from '../auth/enums/user-permission.enum';
import { UserStatus } from '../auth/enums/user-status.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { UserDto } from './dto/user.dto';
import { UserEntity } from './entity/user.entity';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
	private readonly logger = new Logger(UsersController.name);

	constructor(private readonly usersService: UsersService) {}

	@ApiOperation({ summary: 'Get all pending users' })
	@ApiOkResponse({
		description: 'List of pending users retrieved successfully',
	})
	@ApiUnauthorizedResponse({ description: 'Unauthorized' })
	@ApiForbiddenResponse({
		description: 'You do not have permission to read users',
	})
	@ApiQuery({
		name: 'status',
		required: false,
		enum: Object.values(UserStatus),
		enumName: 'UserStatus',
		description: 'Filter users by status',
	})
	@RequirePermission('read', 'user')
	@Get()
	async getUsers(@Query('status') status?: UserStatus): Promise<UserDto[]> {
		return this.usersService.findUsers(status);
	}

	@ApiOperation({ summary: 'Approve a user' })
	@ApiOkResponse({ description: 'User approved successfully' })
	@ApiNotFoundResponse({ description: 'User not found' })
	@ApiForbiddenResponse({
		description: 'You do not have permission to approve users',
	})
	@RequirePermission('approve', 'user')
	@Patch(':id/approve')
	async approveUser(@Param('id') userId: string, @CurrentUser() requestingUser: UserEntity) {
		this.logger.warn(`approve user called on userId: ${userId}`);
		return this.usersService.approveUser(userId, requestingUser);
	}

	@ApiOperation({ summary: 'Block a user' })
	@ApiOkResponse({ description: 'User blocked successfully' })
	@ApiNotFoundResponse({ description: 'User not found' })
	@ApiForbiddenResponse({
		description: 'You do not have permission to block users',
	})
	@RequirePermission('block', 'user')
	@Patch(':id/block')
	async blockUser(@Param('id') userId: string) {
		this.logger.warn(`block user called on userId: ${userId}`);
		return this.usersService.blockUser(userId);
	}

	@ApiOperation({ summary: 'Update user permissions' })
	@ApiOkResponse({ description: 'User permissions updated successfully' })
	@ApiNotFoundResponse({ description: 'User not found' })
	@ApiForbiddenResponse({
		description: 'You do not have permission to update user permissions',
	})
	@RequirePermission('update', 'user')
	@Patch(':id/permissions')
	async updatePermissions(
		@Param('id') userId: string,
		@CurrentUser() requestingUser: UserEntity,
		@Body() body: { permissions: UserPermission[] },
	) {
		return this.usersService.updatePermissions(userId, body.permissions, requestingUser);
	}

	@ApiOperation({ summary: 'Get user by id' })
	@ApiOkResponse({ description: 'User retrieved successfully' })
	@ApiNotFoundResponse({ description: 'User not found' })
	@ApiForbiddenResponse({
		description: 'You do not have permission to read users',
	})
	@RequirePermission('read', 'user')
	@Get(':id')
	async getUserById(@Param('id') userId: string): Promise<UserDto> {
		return this.usersService.getUserById(userId);
	}
}
