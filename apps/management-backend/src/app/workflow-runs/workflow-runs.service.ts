import { Injectable } from '@nestjs/common';
import { ArgoClientService } from '../argo-client/argo-client.service';
import { WorkflowRunDto } from './dto/workflow-run.dto';

@Injectable()
export class WorkflowRunsService {
	constructor(private readonly argoClientService: ArgoClientService) {}

	/**
	 * Lists all Argo Workflows.
	 */
	async listWorkflows(): Promise<WorkflowRunDto[]> {
		return this.argoClientService.listWorkflows();
	}
}
