import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserPermission } from '../auth/enums/user-permission.enum';
import { UserStatus } from '../auth/enums/user-status.enum';
import { UserDto } from './dto/user.dto';
import { UserEntity } from './entity/user.entity';
import { mapUserEntityToUserDto } from './mapper/users.mapper';

@Injectable()
export class UsersService {
	constructor(
		@InjectRepository(UserEntity)
		private readonly usersRepository: Repository<UserEntity>,
	) {}

	async create(userData: Partial<UserEntity>): Promise<UserEntity> {
		const user = this.usersRepository.create(userData);
		return this.usersRepository.save(user);
	}

	async findById(id: string): Promise<UserEntity | null> {
		return this.usersRepository.findOne({ where: { id } });
	}

	async findByUsername(username: string): Promise<UserEntity | null> {
		return this.usersRepository.findOne({ where: { username } });
	}

	async count(): Promise<number> {
		return this.usersRepository.count();
	}

	async getUserById(userId: string): Promise<UserDto> {
		const user = await this.findById(userId);
		if (!user) {
			throw new ForbiddenException('User not found');
		}
		return mapUserEntityToUserDto(user);
	}

	async findUsers(status?: UserStatus): Promise<UserDto[]> {
		const whereClause = status ? { status } : {};
		const users = await this.usersRepository.find({
			where: whereClause,
			order: { createdAt: 'DESC' },
		});
		return users.map(mapUserEntityToUserDto);
	}

	async approveUser(userId: string, requestingUser: UserEntity): Promise<void> {
		await this.findUserByIdOrFail(userId);

		// Give user basic default permissions upon approval (read crawler runs, health, services)
		const permissions: UserPermission[] = [
			UserPermission.CRAWLER_RUN_READ,
			UserPermission.HEALTH_READ,
			UserPermission.SERVICE_READ,
		];
		await this.usersRepository.update(userId, {
			status: UserStatus.ACTIVE,
			approvedBy: requestingUser.id,
			approvedAt: new Date(),
			permissions: permissions,
		});
	}

	async blockUser(userId: string): Promise<void> {
		await this.findUserByIdOrFail(userId);

		await this.usersRepository.update(userId, {
			status: UserStatus.BLOCKED,
			approvedBy: null,
			approvedAt: null,
		});
	}

	async updatePermissions(
		userId: string,
		permissions: UserPermission[],
		requestingUser: UserEntity,
	): Promise<void> {
		// Prevent users from updating their own permissions
		if (userId === requestingUser.id) {
			throw new ForbiddenException('You cannot update your own permissions');
		}

		await this.findUserByIdOrFail(userId);

		await this.usersRepository.update(userId, { permissions });
	}

	/**
	 * Find a user by ID or throw a ForbiddenException if not found
	 * @param userId
	 * @private
	 */
	private async findUserByIdOrFail(userId: string): Promise<UserEntity> {
		const user = await this.findById(userId);
		if (!user) {
			throw new ForbiddenException('User not found');
		}
		return user;
	}
}
