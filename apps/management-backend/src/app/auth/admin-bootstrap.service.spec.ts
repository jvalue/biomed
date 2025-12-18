import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UsersService } from '../users/users.service';
import { AdminBootstrapService } from './admin-bootstrap.service';
import { UserPermission } from './enums/user-permission.enum';
import { UserStatus } from './enums/user-status.enum';

vi.mock('bcrypt', () => ({
	hash: vi.fn(),
}));

describe('AdminBootstrapService', () => {
	let service: AdminBootstrapService;
	let mockConfigService: { get: ReturnType<typeof vi.fn> };
	let mockUsersService: { count: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };

	beforeEach(() => {
		vi.restoreAllMocks();
		mockConfigService = { get: vi.fn() };
		mockUsersService = { count: vi.fn(), create: vi.fn() };
		service = new AdminBootstrapService(
			mockConfigService as unknown as ConfigService,
			mockUsersService as unknown as UsersService,
		);
	});

	it('does nothing when users already exist', async () => {
		mockUsersService.count.mockResolvedValue(5);

		await service.onModuleInit();

		expect(mockUsersService.create).not.toHaveBeenCalled();
		expect(mockConfigService.get).not.toHaveBeenCalled();
		expect(bcrypt.hash).not.toHaveBeenCalled();
	});

	it('does nothing when ADMIN_USERNAME or ADMIN_PASSWORD are not set', async () => {
		mockUsersService.count.mockResolvedValue(0);
		mockConfigService.get.mockImplementation(() => undefined);

		await service.onModuleInit();

		expect(mockUsersService.create).not.toHaveBeenCalled();
		expect(mockConfigService.get).toHaveBeenCalledWith('ADMIN_USERNAME');
		expect(mockConfigService.get).toHaveBeenCalledWith('ADMIN_PASSWORD');
	});

	it('hashes password and creates admin when no users exist and env vars present', async () => {
		mockUsersService.count.mockResolvedValue(0);
		mockConfigService.get.mockImplementation((key: string) => {
			if (key === 'ADMIN_USERNAME') return 'admin';
			if (key === 'ADMIN_PASSWORD') return 's3cr3t';
			return undefined;
		});

		// bcrypt.hash is mocked via vi.mock above; cast to any to access mock helpers
		(bcrypt.hash as unknown as ReturnType<typeof vi.fn>).mockResolvedValue('hashed-s3cr3t');

		await service.onModuleInit();

		expect(bcrypt.hash).toHaveBeenCalledWith('s3cr3t', 10);
		expect(mockUsersService.create).toHaveBeenCalledWith({
			username: 'admin',
			passwordHash: 'hashed-s3cr3t',
			status: UserStatus.ACTIVE,
			permissions: Object.values(UserPermission),
		});
	});
});
