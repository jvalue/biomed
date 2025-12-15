import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
	ApiCreatedResponse,
	ApiNotFoundResponse,
	ApiOkResponse,
	ApiOperation,
	ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UserEntity } from '../users/entity/user.entity';
import { AbilityFactory } from './ability-factory';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDataDto } from './dto/login-data.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
	constructor(
		private readonly authService: AuthService,
		private readonly abilityFactory: AbilityFactory,
	) {}

	@ApiOperation({ summary: 'Register a new user' })
	@ApiCreatedResponse({ description: 'User registered successfully, now waiting for approval' })
	@Post('register')
	async register(@Body() registerDto: LoginDataDto) {
		return this.authService.register(registerDto);
	}

	@ApiOperation({ summary: 'Login a user' })
	@ApiCreatedResponse({ description: 'User logged in successfully' })
	@ApiUnauthorizedResponse({ description: 'Invalid credentials' })
	@Post('login')
	async login(@Body() loginDto: LoginDataDto) {
		return this.authService.login(loginDto);
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
}
