import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AbilityFactory } from '../ability-factory';
import { Actions, Subjects } from '../types/ability.types';

interface PermissionRequirement {
	action: Actions;
	subject: Subjects;
}

@Injectable()
export class PermissionsGuard implements CanActivate {
	constructor(
		private readonly reflector: Reflector,
		private readonly abilityFactory: AbilityFactory,
	) {}

	canActivate(context: ExecutionContext): boolean {
		const requirement = this.reflector.get<PermissionRequirement>(
			'permission',
			context.getHandler(),
		);

		if (!requirement) {
			return true;
		}

		const request = context.switchToHttp().getRequest();
		const user = request.user;

		const ability = this.abilityFactory.defineAbilityFor(user);
		return ability.can(requirement.action, requirement.subject);
	}
}
