import { UserEntity } from '../../users/entity/user.entity';

// Contains all non-sensitive information about an API key
export class ApiKeySafeDto {
	id: string;
	prefix: string;
	description: string;
	isActive: boolean;
	createdAt: Date;
	lastUsedAt: Date | null;
	createdBy: UserEntity;
}
