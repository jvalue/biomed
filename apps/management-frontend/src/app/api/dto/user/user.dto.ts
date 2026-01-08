/*
 * Defines the possible statuses for a user account.
 */
export enum UserStatus {
	// User account is created but not yet approved by admin
	PENDING = 'pending',
	// User account is active and can access the system
	ACTIVE = 'active',
	// User account has been declined or blocked by admin
	BLOCKED = 'blocked',
}

/*
 * 	Defines fine granular user permission options for the application.
 */
export enum UserPermission {
	// Crawler Run Permissions
	CRAWLER_RUN_CREATE = 'crawler-run:create',
	CRAWLER_RUN_READ = 'crawler-run:read',
	CRAWLER_RUN_UPDATE = 'crawler-run:update',
	CRAWLER_RUN_DELETE = 'crawler-run:delete',

	// Crawler Template Permissions
	CRAWLER_TEMPLATE_CREATE = 'crawler-template:create',
	CRAWLER_TEMPLATE_READ = 'crawler-template:read',
	CRAWLER_TEMPLATE_UPDATE = 'crawler-template:update',
	CRAWLER_TEMPLATE_DELETE = 'crawler-template:delete',

	// Schedule Permissions
	SCHEDULE_CREATE = 'schedule:create',
	SCHEDULE_READ = 'schedule:read',
	SCHEDULE_UPDATE = 'schedule:update',
	SCHEDULE_DELETE = 'schedule:delete',

	// User Management Permissions
	USER_READ = 'user:read',
	USER_UPDATE = 'user:update',
	USER_DELETE = 'user:delete',
	USER_APPROVE = 'user:approve',
	USER_BLOCK = 'user:block',

	// Health Status Permissions
	HEALTH_READ = 'health:read',
	HEALTH_CREATE = 'health:create',
	HEALTH_UPDATE = 'health:update',
	HEALTH_DELETE = 'health:delete',
}

export class UserDto {
	id!: string;

	username!: string;

	status!: UserStatus;

	permissions!: UserPermission[];

	createdAt!: Date;

	approvedBy?: string;

	approvedAt?: Date;
}
