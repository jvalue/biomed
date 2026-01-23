import { ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { Response } from 'express';
import { Repository } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UsersService } from '../users/users.service';
import { AbilityFactory } from './ability-factory';
import { AuthService } from './auth.service';
import { ApiKeyEntity } from './entity/api-key.entity';
import { UserStatus } from './enums/user-status.enum';

// Mock bcrypt
vi.mock('bcrypt', () => ({
	hash: vi.fn(),
	compare: vi.fn(),
}));

describe('AuthService', () => {
	let service: AuthService;
	let mockUsersService: {
		findByUsername: ReturnType<typeof vi.fn>;
		create: ReturnType<typeof vi.fn>;
		findById: ReturnType<typeof vi.fn>;
	};
	let mockJwtService: { sign: ReturnType<typeof vi.fn> };
	let mockAbilityFactory: { serializeAbility: ReturnType<typeof vi.fn> };
	let mockResponse: Partial<Response>;

	beforeEach(() => {
		vi.resetAllMocks();

		mockUsersService = {
			findByUsername: vi.fn(),
			create: vi.fn(),
			findById: vi.fn(),
		};
		mockJwtService = { sign: vi.fn() };
		mockAbilityFactory = { serializeAbility: vi.fn() };

		mockResponse = {
			cookie: vi.fn(),
		};

		service = new AuthService(
			{} as Repository<ApiKeyEntity>, // mock of ApiKeyRepository
			mockUsersService as unknown as UsersService,
			mockJwtService as unknown as JwtService,
			mockAbilityFactory as unknown as AbilityFactory,
		);
	});

	it('register throws ConflictException when username exists', async () => {
		mockUsersService.findByUsername.mockResolvedValue({ id: '1', username: 'exists' });

		await expect(service.register({ username: 'exists', password: 'pw' })).rejects.toBeInstanceOf(
			ConflictException,
		);
	});

	it('register hashes password and creates user when username is new', async () => {
		mockUsersService.findByUsername.mockResolvedValue(null);
		// biome-ignore lint/suspicious/noExplicitAny: <library function>
		(bcrypt.hash as any).mockResolvedValue('hashed-pw');
		mockUsersService.create.mockResolvedValue(undefined);

		await expect(service.register({ username: 'newuser', password: 'pw' })).resolves.toEqual({
			message: 'Registration successful. Please wait for admin approval.',
		});

		expect(bcrypt.hash).toHaveBeenCalledWith('pw', 10);
		expect(mockUsersService.create).toHaveBeenCalledWith({
			username: 'newuser',
			passwordHash: 'hashed-pw',
			status: UserStatus.PENDING,
		});
	});

	it('login throws UnauthorizedException when user not found', async () => {
		mockUsersService.findByUsername.mockResolvedValue(null);

		await expect(
			service.login({ username: 'no', password: 'pw' }, mockResponse as Response),
		).rejects.toBeInstanceOf(UnauthorizedException);
	});

	it('login throws UnauthorizedException when password invalid', async () => {
		const user = { id: '1', username: 'u', passwordHash: 'h', status: UserStatus.ACTIVE };
		mockUsersService.findByUsername.mockResolvedValue(user);
		// biome-ignore lint/suspicious/noExplicitAny: <library function>
		(bcrypt.compare as any).mockResolvedValue(false);

		await expect(
			service.login({ username: 'u', password: 'wrong' }, mockResponse as Response),
		).rejects.toBeInstanceOf(UnauthorizedException);
	});

	it('login throws ForbiddenException when user is not active', async () => {
		const user = { id: '1', username: 'u', passwordHash: 'h', status: UserStatus.PENDING };
		mockUsersService.findByUsername.mockResolvedValue(user);
		// biome-ignore lint/suspicious/noExplicitAny: <library function>
		(bcrypt.compare as any).mockResolvedValue(true);

		await expect(
			service.login({ username: 'u', password: 'pw' }, mockResponse as Response),
		).rejects.toBeInstanceOf(ForbiddenException);
	});

	it('login sets httponly cookie and returns user when credentials valid and user active', async () => {
		const user = {
			id: '1',
			username: 'u',
			passwordHash: 'h',
			status: UserStatus.ACTIVE,
			permissions: ['perm'],
			createdAt: '2020-01-01',
			approvedBy: 'admin',
			approvedAt: '2020-02-01',
		};

		mockUsersService.findByUsername.mockResolvedValue(user);
		// biome-ignore lint/suspicious/noExplicitAny: <library function>
		(bcrypt.compare as any).mockResolvedValue(true);
		mockJwtService.sign.mockReturnValue('access-token');
		mockAbilityFactory.serializeAbility.mockReturnValue(['rule']);

		const result = await service.login({ username: 'u', password: 'pw' }, mockResponse as Response);

		expect(mockJwtService.sign).toHaveBeenCalledWith({ sub: user.id, username: user.username });

		const expectedOptions = {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'strict',
			maxAge: 30 * 60 * 1000,
		};
		// biome-ignore lint/suspicious/noExplicitAny: <library function>
		expect(mockResponse.cookie as any).toHaveBeenCalledWith(
			'accessToken',
			'access-token',
			expectedOptions,
		);

		expect(result).toEqual({
			user: {
				id: user.id,
				username: user.username,
				status: user.status,
				permissions: user.permissions,
				createdAt: user.createdAt,
				approvedBy: user.approvedBy,
				approvedAt: user.approvedAt,
			},
			abilityRules: ['rule'],
		});
	});

	it('validateUser delegates to usersService.findById', async () => {
		mockUsersService.findById.mockResolvedValue({ id: '42' });

		await expect(service.validateUser('42')).resolves.toEqual({ id: '42' });
		expect(mockUsersService.findById).toHaveBeenCalledWith('42');
	});
});
