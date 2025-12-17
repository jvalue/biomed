import { ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';
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

	beforeEach(() => {
		vi.resetAllMocks();

		mockUsersService = {
			findByUsername: vi.fn(),
			create: vi.fn(),
			findById: vi.fn(),
		};
		mockJwtService = { sign: vi.fn() };
		mockAbilityFactory = { serializeAbility: vi.fn() };

		service = new AuthService(
			mockUsersService as any,
			mockJwtService as any,
			mockAbilityFactory as any,
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

		await expect(service.login({ username: 'no', password: 'pw' })).rejects.toBeInstanceOf(
			UnauthorizedException,
		);
	});

	it('login throws UnauthorizedException when password invalid', async () => {
		const user = { id: '1', username: 'u', passwordHash: 'h', status: UserStatus.ACTIVE };
		mockUsersService.findByUsername.mockResolvedValue(user);
		(bcrypt.compare as any).mockResolvedValue(false);

		await expect(service.login({ username: 'u', password: 'wrong' })).rejects.toBeInstanceOf(
			UnauthorizedException,
		);
	});

	it('login throws ForbiddenException when user is not active', async () => {
		const user = { id: '1', username: 'u', passwordHash: 'h', status: UserStatus.PENDING };
		mockUsersService.findByUsername.mockResolvedValue(user);
		(bcrypt.compare as any).mockResolvedValue(true);

		await expect(service.login({ username: 'u', password: 'pw' })).rejects.toBeInstanceOf(
			ForbiddenException,
		);
	});

	it('login returns tokens and user when credentials valid and user active', async () => {
		const user = {
			id: '1',
			username: 'u',
			passwordHash: 'h',
			status: UserStatus.ACTIVE,
			permissions: ['perm'],
			createdAt: '2020-01-01',
			approvedBy: 'admin',
			approvedAt: '2020-02-01',
		} as any;

		mockUsersService.findByUsername.mockResolvedValue(user);
		(bcrypt.compare as any).mockResolvedValue(true);
		mockJwtService.sign.mockReturnValue('access-token');
		mockAbilityFactory.serializeAbility.mockReturnValue(['rule']);

		const result = await service.login({ username: 'u', password: 'pw' });

		expect(mockJwtService.sign).toHaveBeenCalledWith({ sub: user.id, username: user.username });
		expect(result).toEqual({
			accessToken: 'access-token',
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
