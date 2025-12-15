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
