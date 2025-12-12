import { Injectable, Logger } from '@nestjs/common';
import { ArgoClientService } from '../argo-client/argo-client.service';
import { CurserBasedPaginationResponseDto } from '../pagination/dto/curser-based-pagination-response.dto';
import { WorkflowRunDto } from './dto/workflow-run.dto';
import { WorkflowRunFilterDto } from './dto/workflow-run-filter.dto';

@Injectable()
export class WorkflowRunsService {
	private readonly logger = new Logger(WorkflowRunsService.name);

	constructor(private readonly argoClientService: ArgoClientService) {}

	/**
	 * Lists all Argo Workflows.
	 * @param filter Optional filtering options
	 */
	async listWorkflows(
		filter?: WorkflowRunFilterDto,
	): Promise<CurserBasedPaginationResponseDto<WorkflowRunDto>> {
		return this.argoClientService.listWorkflows(filter);
	}
}
