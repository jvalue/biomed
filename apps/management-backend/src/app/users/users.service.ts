import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserPermission } from '../auth/enums/user-permission.enum';
import { UserStatus } from '../auth/enums/user-status.enum';
import { UserDto } from './dto/user.dto';
import { UserEntity } from './entity/user.entity';
import { mapUserEntityToUserDto } from './mapper/users.mapper';

@Injectable()
export class UsersService {
	private readonly logger = new Logger(UsersService.name);

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
			this.logger.warn(`User with id ${userId} not found`);
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

		// Give user basic default permissions upon approval (read workflows)
		const permissions: UserPermission[] = [UserPermission.WORKFLOW_READ];
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
			this.logger.warn(`User ${requestingUser.id} attempted to update their own permissions`);
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
			this.logger.warn(`User with id ${userId} not found`);
			throw new ForbiddenException('User not found');
		}
		return user;
	}
}
