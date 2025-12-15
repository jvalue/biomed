import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserPermission } from '../auth/enums/user-permission.enum';
import { UserStatus } from '../auth/enums/user-status.enum';
import { UserEntity } from './entity/user.entity';

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

	async findPendingUsers(): Promise<UserEntity[]> {
		return this.usersRepository.find({
			where: { status: UserStatus.PENDING },
			order: { createdAt: 'DESC' },
		});
	}

	async approveUser(userId: string, adminId: string): Promise<UserEntity> {
		await this.usersRepository.update(userId, {
			status: UserStatus.ACTIVE,
			approvedBy: adminId,
			approvedAt: new Date(),
		});
		return this.findById(userId);
	}

	async updatePermissions(userId: string, permissions: UserPermission[]): Promise<UserEntity> {
		await this.usersRepository.update(userId, { permissions });
		return this.findById(userId);
	}
}
