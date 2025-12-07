import { Controller, Get } from '@nestjs/common';
import { WorkflowRunDto } from './dto/workflow-run.dto';
import { WorkflowRunsService } from './workflow-runs.service';

@Controller('workflow-runs')
export class WorkflowRunsController {
	constructor(private readonly workflowRunsService: WorkflowRunsService) {}

	@Get()
	async listArgoWorkflows(): Promise<WorkflowRunDto[]> {
		return this.workflowRunsService.listWorkflows();
	}
}
