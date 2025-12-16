import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AbilityFactory } from '../auth/ability-factory';
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
		private readonly abilityFactory: AbilityFactory,
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

	async findUsers(requestingUser: UserEntity, status?: UserStatus): Promise<UserDto[]> {
		// Check if user has rights to read users
		const ability = this.abilityFactory.defineAbilityFor(requestingUser);
		if (!ability.can('read', 'user')) {
			this.logger.warn(`User ${requestingUser.id} attempted to read users without permission`);
			throw new ForbiddenException('You do not have permission to read users');
		}

		const whereClause = status ? { status } : {};
		const users = await this.usersRepository.find({
			where: whereClause,
			order: { createdAt: 'DESC' },
		});
		return users.map(mapUserEntityToUserDto);
	}

	async approveUser(userId: string, requestingUser: UserEntity): Promise<void> {
		// Check if user has rights to approve users
		const ability = this.abilityFactory.defineAbilityFor(requestingUser);
		if (!ability.can('approve', 'user')) {
			this.logger.warn(`User ${requestingUser.id} attempted to approve a user without permission`);
			throw new ForbiddenException('You do not have permission to approve users');
		}

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

	async blockUser(userId: string, requestingUser: UserEntity): Promise<void> {
		// Check if user has rights to block users
		const ability = this.abilityFactory.defineAbilityFor(requestingUser);
		if (!ability.can('block', 'user')) {
			this.logger.warn(`User ${requestingUser.id} attempted to block a user without permission`);
			throw new ForbiddenException('You do not have permission to block users');
		}

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
		// Check if user has rights to update user permissions
		const ability = this.abilityFactory.defineAbilityFor(requestingUser);
		if (!ability.can('update', 'user')) {
			this.logger.warn(
				`User ${requestingUser.id} attempted to update user permissions without permission`,
			);
			throw new ForbiddenException('You do not have permission to update user permissions');
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
