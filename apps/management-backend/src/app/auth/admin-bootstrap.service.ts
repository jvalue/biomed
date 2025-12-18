import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { UserPermission } from './enums/user-permission.enum';
import { UserStatus } from './enums/user-status.enum';

/**
 * Service that bootstraps an initial admin user on application startup if no users exist.
 */
@Injectable()
export class AdminBootstrapService implements OnModuleInit {
	private readonly logger = new Logger(AdminBootstrapService.name);

	constructor(
		private readonly configService: ConfigService,
		private readonly usersService: UsersService,
	) {}

	async onModuleInit(): Promise<void> {
		const userCount = await this.usersService.count();
		if (userCount > 0) {
			this.logger.debug('Users exist — skipping admin bootstrap.');
			return;
		}

		const username = this.configService.get('ADMIN_USERNAME');
		const password = this.configService.get('ADMIN_PASSWORD');
		if (!username || !password) {
			this.logger.warn('ADMIN_USERNAME or ADMIN_PASSWORD not set. Skipping admin creation.');
			return;
		}

		const passwordHash = await bcrypt.hash(password, 10);

		await this.usersService.create({
			username,
			passwordHash,
			status: UserStatus.ACTIVE,
			permissions: Object.values(UserPermission),
		});

		this.logger.log(`Initial Admin user "${username}" created from environment variables.`);
	}
}
