import { RawRule } from '@casl/ability';
import { beforeEach, describe, expect, it } from 'vitest';
import { UserEntity } from '../users/entity/user.entity';
import { AbilityFactory } from './ability-factory';
import { UserPermission } from './enums/user-permission.enum';

describe('AbilityFactory', () => {
	let factory: AbilityFactory;

	beforeEach(() => {
		factory = new AbilityFactory();
	});

	it('grants abilities for given permissions', () => {
		const user = {
			permissions: [
				UserPermission.WORKFLOW_CREATE,
				UserPermission.TEMPLATE_READ,
				UserPermission.USER_APPROVE,
			],
		} as UserEntity;

		const ability = factory.defineAbilityFor(user);

		expect(ability.can('create', 'workflow')).toBe(true);
		expect(ability.can('read', 'template')).toBe(true);
		expect(ability.can('approve', 'user')).toBe(true);

		// ensure unrelated actions are denied
		expect(ability.can('delete', 'workflow')).toBe(false);
		expect(ability.can('update', 'template')).toBe(false);
		expect(ability.can('block', 'user')).toBe(false);
	});

	it('ignores unknown or unsupported permissions', () => {
		const user = {
			permissions: ['UNKNOWN_PERMISSION'],
		} as unknown as UserEntity;

		const ability = factory.defineAbilityFor(user);

		// No known rights should be granted
		expect(ability.can('create', 'workflow')).toBe(false);
		expect(ability.can('read', 'template')).toBe(false);
		expect(ability.can('approve', 'user')).toBe(false);
	});

	it('serializeAbility returns the underlying rules array', () => {
		const user = {
			permissions: [UserPermission.USER_BLOCK, UserPermission.TEMPLATE_UPDATE],
		} as unknown as UserEntity;

		const rules = factory.serializeAbility(user);

		expect(Array.isArray(rules)).toBe(true);
		expect(rules.length).toBeGreaterThan(0);

		// At least one rule should correspond to one of the permissions
		const hasBlockUser = rules.some((r: RawRule) => r.action === 'block' && r.subject === 'user');
		const hasUpdateTemplate = rules.some(
			(r: RawRule) => r.action === 'update' && r.subject === 'template',
		);

		expect(hasBlockUser || hasUpdateTemplate).toBe(true);
	});
});
