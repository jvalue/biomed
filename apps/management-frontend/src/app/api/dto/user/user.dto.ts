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
	// Workflow Permissions
	WORKFLOW_CREATE = 'workflow:create',
	WORKFLOW_READ = 'workflow:read',
	WORKFLOW_UPDATE = 'workflow:update',
	WORKFLOW_DELETE = 'workflow:delete',

	// Template Permissions
	TEMPLATE_CREATE = 'template:create',
	TEMPLATE_READ = 'template:read',
	TEMPLATE_UPDATE = 'template:update',
	TEMPLATE_DELETE = 'template:delete',

	// User Management Permissions
	USER_READ = 'user:read',
	USER_UPDATE = 'user:update',
	USER_DELETE = 'user:delete',
	USER_APPROVE = 'user:approve',
	USER_BLOCK = 'user:block',
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
