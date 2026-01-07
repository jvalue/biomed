import { ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserPermission } from '../auth/enums/user-permission.enum';
import { UserStatus } from '../auth/enums/user-status.enum';
import { UserDto } from './dto/user.dto';
import { UserEntity } from './entity/user.entity';
import { mapUserEntityToUserDto } from './mapper/users.mapper';
import { UsersService } from './users.service';

// Mock mapper
vi.mock('./mapper/users.mapper', () => ({
	mapUserEntityToUserDto: vi.fn(),
}));

describe('UsersService (relevant methods)', () => {
	let service: UsersService;
	let mockRepo: {
		create: ReturnType<typeof vi.fn>;
		save: ReturnType<typeof vi.fn>;
		findOne: ReturnType<typeof vi.fn>;
		count: ReturnType<typeof vi.fn>;
		find: ReturnType<typeof vi.fn>;
		update: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		vi.resetAllMocks();

		mockRepo = {
			create: vi.fn(),
			save: vi.fn(),
			findOne: vi.fn(),
			count: vi.fn(),
			find: vi.fn(),
			update: vi.fn(),
		};

		// instantiate service with mocked repository
		service = new UsersService(mockRepo as unknown as Repository<UserEntity>);
	});

	it('getUserById returns mapped DTO when user exists', async () => {
		const entity = { id: '1', username: 'u' };
		const dto = { id: '1', username: 'u' } as UserDto;
		mockRepo.findOne.mockResolvedValue(entity);
		vi.mocked(mapUserEntityToUserDto).mockReturnValue(dto);

		const result = await service.getUserById('1');

		expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
		expect(mapUserEntityToUserDto).toHaveBeenCalledWith(entity);
		expect(result).toEqual(dto);
	});

	it('getUserById throws ForbiddenException when user not found', async () => {
		mockRepo.findOne.mockResolvedValue(null);

		await expect(service.getUserById('missing')).rejects.toBeInstanceOf(ForbiddenException);
	});

	it('approveUser updates user with ACTIVE status, approver and default permissions', async () => {
		// ensure findUserByIdOrFail succeeds by returning an entity from findOne
		mockRepo.findOne.mockResolvedValue({ id: 'target' } as UserEntity);
		mockRepo.update.mockResolvedValue(undefined);

		const requestingUser = { id: 'req-1' } as UserEntity;

		await service.approveUser('target', requestingUser);

		expect(mockRepo.update).toHaveBeenCalledWith('target', {
			status: UserStatus.ACTIVE,
			approvedBy: requestingUser.id,
			approvedAt: expect.any(Date),
			permissions: [UserPermission.CRAWLER_RUN_READ, UserPermission.HEALTH_READ],
		});
	});

	it('blockUser updates user to BLOCKED and clears approval fields', async () => {
		mockRepo.findOne.mockResolvedValue({ id: 'to-block' } as UserEntity);
		mockRepo.update.mockResolvedValue(undefined);

		await service.blockUser('to-block');

		expect(mockRepo.update).toHaveBeenCalledWith('to-block', {
			status: UserStatus.BLOCKED,
			approvedBy: null,
			approvedAt: null,
		});
	});

	it('updatePermissions throws ForbiddenException when requesting user updates themselves', async () => {
		const requestingUser = { id: 'same' } as UserEntity;

		await expect(
			service.updatePermissions('same', [UserPermission.CRAWLER_RUN_CREATE], requestingUser),
		).rejects.toBeInstanceOf(ForbiddenException);
	});

	it('updatePermissions throws when target user not found', async () => {
		mockRepo.findOne.mockResolvedValue(null); // findUserByIdOrFail will fail
		const requestingUser = { id: 'other' } as UserEntity;

		await expect(
			service.updatePermissions('missing', [UserPermission.CRAWLER_RUN_READ], requestingUser),
		).rejects.toBeInstanceOf(ForbiddenException);
	});

	it('updatePermissions updates permissions when allowed and user exists', async () => {
		mockRepo.findOne.mockResolvedValue({ id: 'target' } as UserEntity);
		mockRepo.update.mockResolvedValue(undefined);
		const requestingUser = { id: 'admin' } as UserEntity;
		const perms = [UserPermission.CRAWLER_TEMPLATE_READ];

		await service.updatePermissions('target', perms, requestingUser);

		expect(mockRepo.update).toHaveBeenCalledWith('target', { permissions: perms });
	});
});
