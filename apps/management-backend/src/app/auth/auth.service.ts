import {
	ConflictException,
	ForbiddenException,
	Injectable,
	UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import type { Response } from 'express';
import { Repository } from 'typeorm';
import { UserEntity } from '../users/entity/user.entity';
import { UsersService } from '../users/users.service';
import { AbilityFactory } from './ability-factory';
import { ApiKeySafeDto } from './dto/api-key-safe.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDataDto } from './dto/login-data.dto';
import { ApiKeyEntity } from './entity/api-key.entity';
import { UserStatus } from './enums/user-status.enum';

@Injectable()
export class AuthService {
	constructor(
		@InjectRepository(ApiKeyEntity)
		private readonly apiKeyRepository: Repository<ApiKeyEntity>,
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

	async login(loginDto: LoginDataDto, response: Response): Promise<AuthResponseDto> {
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

		// Set HTTP-only cookie
		response.cookie('accessToken', accessToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production', // HTTPS only in production
			sameSite: 'strict',
			maxAge: 30 * 60 * 1000, // 30 min
		});

		const abilityRules = this.abilityFactory.serializeAbility(user);

		return {
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

	/**
	 * Creates a new API key (used for crawlers only)
	 * @param createdBy
	 * @param description
	 */
	async createApiKey(createdBy: UserEntity, description: string): Promise<string> {
		// Generate randomString
		const rawKey = crypto.randomBytes(32).toString('hex');

		const hash = crypto.createHash('sha256').update(rawKey).digest('hex');

		const prefix = rawKey.substring(0, 15);

		await this.apiKeyRepository.save({
			hash: hash,
			prefix: prefix,
			description,
			isActive: true,
			createdById: createdBy.id,
			lastUsedAt: new Date(),
		});

		return rawKey;
	}

	/**
	 * Deactivates an API key
	 * @param apiKeyId
	 */
	async deactivateApiKey(apiKeyId: string): Promise<void> {
		await this.apiKeyRepository.update(apiKeyId, { isActive: false });
	}

	/**
	 * Get all API Keys safely (only prefixes)
	 */
	async getAllApiKeys(): Promise<ApiKeySafeDto[]> {
		const apiKeys = await this.apiKeyRepository.find();
		return apiKeys.map((key) => ({
			id: key.id,
			prefix: key.prefix,
			description: key.description,
			isActive: key.isActive,
			createdAt: key.createdAt,
			lastUsedAt: key.lastUsedAt,
			createdBy: key.createdBy,
		}));
	}

	/**
	 * Validates an API key
	 * @param rawKey
	 */
	async validateApiKey(rawKey: string): Promise<ApiKeyEntity | null> {
		const hash = crypto.createHash('sha256').update(rawKey).digest('hex');
		const keyEntity = await this.apiKeyRepository.findOne({ where: { hash, isActive: true } });

		if (keyEntity) {
			// Update last used timestamp
			await this.apiKeyRepository.update(keyEntity.id, { lastUsedAt: new Date() });
			return keyEntity;
		}
		return null;
	}
}
