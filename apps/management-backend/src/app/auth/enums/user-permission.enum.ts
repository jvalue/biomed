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
