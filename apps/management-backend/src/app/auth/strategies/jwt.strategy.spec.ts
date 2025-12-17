import { UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserStatus } from '../enums/user-status.enum';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
	let jwtStrategy: JwtStrategy;
	let mockConfigService: { get: ReturnType<typeof vi.fn> };
	let mockUsersService: { findById: ReturnType<typeof vi.fn> };

	beforeEach(() => {
		mockConfigService = { get: vi.fn().mockReturnValue('test-secret') };
		mockUsersService = { findById: vi.fn() };
		jwtStrategy = new JwtStrategy(mockConfigService as any, mockUsersService as any);
	});

	it('returns user when payload is valid and user is active', async () => {
		const payload = { sub: '123', username: 'john' };
		const user = { id: '123', username: 'john', status: UserStatus.ACTIVE } as any;
		mockUsersService.findById.mockResolvedValue(user);

		await expect(jwtStrategy.validate(payload)).resolves.toEqual(user);
		expect(mockUsersService.findById).toHaveBeenCalledWith('123');
	});

	it('throws UnauthorizedException when user does not exist', async () => {
		const payload = { sub: '123', username: 'john' };
		mockUsersService.findById.mockResolvedValue(null);

		await expect(jwtStrategy.validate(payload)).rejects.toBeInstanceOf(UnauthorizedException);
	});

	it('throws UnauthorizedException when user is not active', async () => {
		const payload = { sub: '123', username: 'john' };
		const inactiveUser = { id: '123', username: 'john', status: 'INACTIVE' } as any;
		mockUsersService.findById.mockResolvedValue(inactiveUser);

		await expect(jwtStrategy.validate(payload)).rejects.toBeInstanceOf(UnauthorizedException);
	});
});
