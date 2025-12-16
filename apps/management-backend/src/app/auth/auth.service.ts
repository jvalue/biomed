import {
	ConflictException,
	ForbiddenException,
	Injectable,
	UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { AbilityFactory } from './ability-factory';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDataDto } from './dto/login-data.dto';
import { UserStatus } from './enums/user-status.enum';

@Injectable()
export class AuthService {
	constructor(
		private readonly usersService: UsersService,
		private readonly jwtService: JwtService,
		private readonly abilityFactory: AbilityFactory,
	) {}

	async register(registerDto: LoginDataDto): Promise<{ message: string }> {
		const existingUser = await this.usersService.findByUsername(registerDto.username);
		if (existingUser) {
			throw new ConflictException('Username already exists');
		}

		const passwordHash = await bcrypt.hash(registerDto.password, 10);

		await this.usersService.create({
			username: registerDto.username,
			passwordHash,
			status: UserStatus.PENDING,
		});

		return {
			message: 'Registration successful. Please wait for admin approval.',
		};
	}

	async login(loginDto: LoginDataDto): Promise<AuthResponseDto> {
		const user = await this.usersService.findByUsername(loginDto.username);

		if (!user) {
			throw new UnauthorizedException('Invalid credentials');
		}

		const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);
		if (!isPasswordValid) {
			throw new UnauthorizedException('Invalid credentials');
		}

		if (user.status !== UserStatus.ACTIVE) {
			throw new ForbiddenException('Account not approved yet');
		}

		const accessToken = this.jwtService.sign({
			sub: user.id,
			username: user.username,
		});

		const abilityRules = this.abilityFactory.serializeAbility(user);

		return {
			accessToken,
			user: {
				id: user.id,
				username: user.username,
				status: user.status,
				permissions: user.permissions,
				createdAt: user.createdAt,
				approvedBy: user.approvedBy,
				approvedAt: user.approvedAt,
			},
			abilityRules,
		};
	}

	async validateUser(userId: string) {
		return this.usersService.findById(userId);
	}
}
