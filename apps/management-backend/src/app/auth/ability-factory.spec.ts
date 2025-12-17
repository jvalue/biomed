import { beforeEach, describe, expect, it } from 'vitest';
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
		} as any;

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
			permissions: ['UNKNOWN_PERMISSION'] as any[],
		} as any;

		const ability = factory.defineAbilityFor(user);

		// No known rights should be granted
		expect(ability.can('create', 'workflow')).toBe(false);
		expect(ability.can('read', 'template')).toBe(false);
		expect(ability.can('approve', 'user')).toBe(false);
	});

	it('serializeAbility returns the underlying rules array', () => {
		const user = {
			permissions: [UserPermission.USER_BLOCK, UserPermission.TEMPLATE_UPDATE],
		} as any;

		const rules = factory.serializeAbility(user);

		expect(Array.isArray(rules)).toBe(true);
		expect(rules.length).toBeGreaterThan(0);

		// At least one rule should correspond to one of the permissions
		const hasBlockUser = rules.some(
			(r: any) =>
				(r.action === 'block' || (Array.isArray(r.actions) && r.actions.includes('block'))) &&
				(r.subject === 'user' || r.subjectName === 'user'),
		);
		const hasUpdateTemplate = rules.some(
			(r: any) =>
				(r.action === 'update' || (Array.isArray(r.actions) && r.actions.includes('update'))) &&
				(r.subject === 'template' || r.subjectName === 'template'),
		);

		expect(hasBlockUser || hasUpdateTemplate).toBe(true);
	});
});
