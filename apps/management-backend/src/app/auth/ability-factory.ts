import { AbilityBuilder, PureAbility } from '@casl/ability';
import { Injectable } from '@nestjs/common';
import { UserEntity } from '../users/entity/user.entity';
import { UserPermission } from './enums/user-permission.enum';
import { AppAbility } from './types/ability.types';

/**
 * AbilityFactory is responsible for defining and serializing user abilities
 * based on their permissions.
 */
@Injectable()
export class AbilityFactory {
	defineAbilityFor(user: UserEntity): AppAbility {
		const { can, build } = new AbilityBuilder<AppAbility>(PureAbility);

		//  Fine-grained permission mapping
		const permissionMap: Record<UserPermission, () => void> = {
			// Workflow Permissions
			[UserPermission.WORKFLOW_CREATE]: () => can('create', 'workflow'),
			[UserPermission.WORKFLOW_READ]: () => can('read', 'workflow'),
			[UserPermission.WORKFLOW_UPDATE]: () => can('update', 'workflow'),
			[UserPermission.WORKFLOW_DELETE]: () => can('delete', 'workflow'),

			// Template Permissions
			[UserPermission.TEMPLATE_CREATE]: () => can('create', 'template'),
			[UserPermission.TEMPLATE_READ]: () => can('read', 'template'),
			[UserPermission.TEMPLATE_UPDATE]: () => can('update', 'template'),
			[UserPermission.TEMPLATE_DELETE]: () => can('delete', 'template'),

			// User Management Permissions
			[UserPermission.USER_READ]: () => can('read', 'user'),
			[UserPermission.USER_UPDATE]: () => can('update', 'user'),
			[UserPermission.USER_DELETE]: () => can('delete', 'user'),
			[UserPermission.USER_APPROVE]: () => can('approve', 'user'),
			[UserPermission.USER_BLOCK]: () => can('block', 'user'),
		};

		user.permissions?.forEach((permission) => {
			permissionMap[permission]?.();
		});

		return build();
	}

	serializeAbility(user: UserEntity) {
		const ability = this.defineAbilityFor(user);
		return ability.rules;
	}
}
