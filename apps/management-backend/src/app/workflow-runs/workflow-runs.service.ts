import { Injectable, Logger } from '@nestjs/common';
import { ArgoClientService } from '../argo-client/argo-client.service';
import { WorkflowPhaseEnum } from '../argo-client/enums/workflow-phase.enum';
import { WorkflowRunDto } from './dto/workflow-run.dto';

@Injectable()
export class WorkflowRunsService {
	private readonly logger = new Logger(WorkflowRunsService.name);

	constructor(private readonly argoClientService: ArgoClientService) {}

	/**
	 * Lists all Argo Workflows.
	 */
	async listWorkflows(): Promise<WorkflowRunDto[]> {
		return this.argoClientService.listWorkflows({
			namespace: 'argo-managed-crawler',
			template: 'test-workflow',
			phases: [WorkflowPhaseEnum.ERROR, WorkflowPhaseEnum.SUCCEEDED],
			createdAfter: '2025-12-09T00:00:00Z',
			finishedBefore: '2025-12-10T23:59:59Z',
		});
	}
}
