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
			// Crawler Run Permissions
			[UserPermission.CRAWLER_RUN_CREATE]: () => can('create', 'crawler-run'),
			[UserPermission.CRAWLER_RUN_READ]: () => can('read', 'crawler-run'),
			[UserPermission.CRAWLER_RUN_UPDATE]: () => can('update', 'crawler-run'),
			[UserPermission.CRAWLER_RUN_DELETE]: () => can('delete', 'crawler-run'),

			// Crawler Template Permissions
			[UserPermission.CRAWLER_TEMPLATE_CREATE]: () => can('create', 'crawler-template'),
			[UserPermission.CRAWLER_TEMPLATE_READ]: () => can('read', 'crawler-template'),
			[UserPermission.CRAWLER_TEMPLATE_UPDATE]: () => can('update', 'crawler-template'),
			[UserPermission.CRAWLER_TEMPLATE_DELETE]: () => can('delete', 'crawler-template'),

			// Schedule Permissions
			[UserPermission.SCHEDULE_CREATE]: () => can('create', 'schedule'),
			[UserPermission.SCHEDULE_READ]: () => can('read', 'schedule'),
			[UserPermission.SCHEDULE_UPDATE]: () => can('update', 'schedule'),
			[UserPermission.SCHEDULE_DELETE]: () => can('delete', 'schedule'),

			// User Management Permissions
			[UserPermission.USER_READ]: () => can('read', 'user'),
			[UserPermission.USER_CREATE]: () => can('create', 'user'),
			[UserPermission.USER_UPDATE]: () => can('update', 'user'),
			[UserPermission.USER_DELETE]: () => can('delete', 'user'),
			[UserPermission.USER_APPROVE]: () => can('approve', 'user'),
			[UserPermission.USER_BLOCK]: () => can('block', 'user'),

			// System Health Permissions
			[UserPermission.HEALTH_READ]: () => can('read', 'health'),
			[UserPermission.HEALTH_CREATE]: () => can('create', 'health'),
			[UserPermission.HEALTH_UPDATE]: () => can('update', 'health'),
			[UserPermission.HEALTH_DELETE]: () => can('delete', 'health'),

			// Service Management Permissions
			[UserPermission.SERVICE_CREATE]: () => can('create', 'service'),
			[UserPermission.SERVICE_READ]: () => can('read', 'service'),
			[UserPermission.SERVICE_UPDATE]: () => can('update', 'service'),
			[UserPermission.SERVICE_DELETE]: () => can('delete', 'service'),
			[UserPermission.SERVICE_ABORT]: () => can('abort', 'service'),
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
