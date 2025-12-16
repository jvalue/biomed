import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserPermission } from '../auth/enums/user-permission.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserEntity } from './entity/user.entity';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
	constructor(private readonly usersService: UsersService) {}

	@Get('pending')
	async getPendingUsers() {
		return this.usersService.findPendingUsers();
	}

	@ApiOperation({ summary: 'Approve a pending user' })
	@ApiOkResponse({ description: 'User approved successfully' })
	@ApiNotFoundResponse({ description: 'User not found' })
	@Patch(':id/approve')
	async approveUser(@Param('id') userId: string, @CurrentUser() admin: UserEntity) {
		return this.usersService.approveUser(userId, admin.id);
	}

	@ApiOperation({ summary: 'Update user permissions' })
	@ApiOkResponse({ description: 'User permissions updated successfully' })
	@ApiNotFoundResponse({ description: 'User not found' })
	@Patch(':id/permissions')
	async updatePermissions(
		@Param('id') userId: string,
		@Body() body: { permissions: UserPermission[] },
	) {
		return this.usersService.updatePermissions(userId, body.permissions);
	}
}
