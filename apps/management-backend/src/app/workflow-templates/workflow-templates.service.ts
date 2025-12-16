import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { ArgoClientService } from '../argo-client/argo-client.service';
import { AbilityFactory } from '../auth/ability-factory';
import { UserEntity } from '../users/entity/user.entity';
import { WorkflowTemplateDto } from './dto/workflow-template.dto';
import { WorkflowTemplatesFilterDto } from './dto/workflow-templates-filter.dto';

@Injectable()
export class WorkflowTemplatesService {
	private readonly logger = new Logger(WorkflowTemplatesService.name);

	constructor(
		private readonly argoClientService: ArgoClientService,
		private readonly abilityFactory: AbilityFactory,
	) {}

	/**
	 * Lists all Argo Workflow Templates.
	 * @param requestingUser
	 * @param filter Optional filtering options
	 */
	async listWorkflowTemplates(
		requestingUser: UserEntity,
		filter?: WorkflowTemplatesFilterDto,
	): Promise<WorkflowTemplateDto[]> {
		// Check if the user has permission to read workflow templates
		const ability = this.abilityFactory.defineAbilityFor(requestingUser);
		if (!ability.can('read', 'template')) {
			this.logger.warn(
				`User ${requestingUser.id} attempted to access workflow templates without sufficient permissions.`,
			);
			throw new ForbiddenException('You do not have permission to access workflow templates');
		}

		return this.argoClientService.listWorkflowTemplates(filter);
	}
}
