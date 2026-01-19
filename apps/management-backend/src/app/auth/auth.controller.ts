import { Body, Controller, Get, Post, Res, UseGuards } from '@nestjs/common';
import {
	ApiBody,
	ApiConflictResponse,
	ApiCreatedResponse,
	ApiForbiddenResponse,
	ApiNotFoundResponse,
	ApiOkResponse,
	ApiOperation,
	ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { UserEntity } from '../users/entity/user.entity';
import { AbilityFactory } from './ability-factory';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { RequirePermission } from './decorators/require-permission.decorator';
import { LoginDataDto } from './dto/login-data.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';

@Controller('auth')
export class AuthController {
	constructor(
		private readonly authService: AuthService,
		private readonly abilityFactory: AbilityFactory,
	) {}

	@ApiOperation({ summary: 'Register a new user' })
	@ApiCreatedResponse({ description: 'User registered successfully, now waiting for approval' })
	@ApiConflictResponse({ description: 'Username already exists' })
	@Post('register')
	async register(@Body() registerDto: LoginDataDto) {
		return this.authService.register(registerDto);
	}

	@ApiOperation({ summary: 'Login a user' })
	@ApiCreatedResponse({ description: 'User logged in successfully' })
	@ApiUnauthorizedResponse({ description: 'Invalid credentials' })
	@ApiForbiddenResponse({ description: 'Account not approved yet' })
	@Post('login')
	async login(@Body() loginDto: LoginDataDto, @Res({ passthrough: true }) response: Response) {
		return this.authService.login(loginDto, response);
	}

	@Post('logout')
	@UseGuards(JwtAuthGuard)
	async logout(@Res({ passthrough: true }) response: Response) {
		response.clearCookie('accessToken');
		return { message: 'Logged out successfully' };
	}

	@ApiOperation({ summary: 'Get current user profile' })
	@ApiOkResponse({ description: 'Current user profile retrieved successfully' })
	@ApiNotFoundResponse({ description: 'User not found' })
	@ApiUnauthorizedResponse({ description: 'Unauthorized' })
	@Get('me')
	@UseGuards(JwtAuthGuard)
	async getProfile(@CurrentUser() user: UserEntity) {
		return {
			user: {
				id: user.id,
				username: user.username,
				status: user.status,
				permissions: user.permissions,
			},
			abilityRules: this.abilityFactory.serializeAbility(user),
		};
	}

	@ApiOperation({ summary: 'Generate a new API Key for Machines' })
	@ApiCreatedResponse({
		description: 'API Key generated successfully, Please store the key safely',
	})
	@ApiForbiddenResponse({ description: 'Insufficient permissions' })
	@UseGuards(JwtAuthGuard, PermissionsGuard)
	@RequirePermission('create', 'user')
	@Post('apiKey')
	@ApiBody({ schema: { type: 'object', properties: { description: { type: 'string' } } } })
	async generateApiKey(@Body('description') description: string, @CurrentUser() user: UserEntity) {
		return this.authService.createApiKey(user, description);
	}
}
