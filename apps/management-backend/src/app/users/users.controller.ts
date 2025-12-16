import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import {
	ApiForbiddenResponse,
	ApiNotFoundResponse,
	ApiOkResponse,
	ApiOperation,
	ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserPermission } from '../auth/enums/user-permission.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserEntity } from './entity/user.entity';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
	constructor(private readonly usersService: UsersService) {}

	@ApiOperation({ summary: 'Get all pending users' })
	@ApiOkResponse({ description: 'List of pending users retrieved successfully' })
	@ApiUnauthorizedResponse({ description: 'Unauthorized' })
	@ApiForbiddenResponse({ description: 'You do not have permission to read users' })
	@Get('pending')
	async getPendingUsers(@CurrentUser() requestingUser: UserEntity) {
		return this.usersService.findPendingUsers(requestingUser);
	}

	@ApiOperation({ summary: 'Approve a pending user' })
	@ApiOkResponse({ description: 'User approved successfully' })
	@ApiNotFoundResponse({ description: 'User not found' })
	@ApiForbiddenResponse({ description: 'You do not have permission to approve users' })
	@Patch(':id/approve')
	async approveUser(@Param('id') userId: string, @CurrentUser() requestingUser: UserEntity) {
		return this.usersService.approveUser(userId, requestingUser);
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
