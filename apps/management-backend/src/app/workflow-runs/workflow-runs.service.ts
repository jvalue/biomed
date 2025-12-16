import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { ArgoClientService } from '../argo-client/argo-client.service';
import { AbilityFactory } from '../auth/ability-factory';
import { CurserBasedPaginationResponseDto } from '../pagination/dto/curser-based-pagination-response.dto';
import { CurserBasedPaginationRequestDto } from '../pagination/dto/cursor-based-pagination-request.dto';
import { UserEntity } from '../users/entity/user.entity';
import { WorkflowRunDto } from './dto/workflow-run.dto';
import { WorkflowRunFilterDto } from './dto/workflow-run-filter.dto';

@Injectable()
export class WorkflowRunsService {
	private readonly logger = new Logger(WorkflowRunsService.name);

	constructor(
		private readonly argoClientService: ArgoClientService,
		private readonly abilityFactory: AbilityFactory,
	) {}

	/**
	 * Lists all Argo Workflows.
	 * @param requestingUser
	 * @param filter Optional filtering options
	 * @param pagination Optional pagination options
	 */
	async listWorkflows(
		requestingUser: UserEntity,
		filter?: WorkflowRunFilterDto,
		pagination?: CurserBasedPaginationRequestDto,
	): Promise<CurserBasedPaginationResponseDto<WorkflowRunDto>> {
		// Check if user has rights to read workflows
		const ability = this.abilityFactory.defineAbilityFor(requestingUser);
		if (!ability.can('read', 'workflow')) {
			this.logger.warn(
				`User ${requestingUser.id} attempted to list workflow runs without sufficient permissions`,
			);
			throw new ForbiddenException('You do not have permission to access workflow runs');
		}
		return this.argoClientService.listWorkflows(filter, pagination);
	}
}
