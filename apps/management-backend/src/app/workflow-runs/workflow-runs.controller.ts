import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { WorkflowRunDto } from './dto/workflow-run.dto';
import { WorkflowRunsService } from './workflow-runs.service';

@Controller('workflow-runs')
export class WorkflowRunsController {
	constructor(private readonly workflowRunsService: WorkflowRunsService) {}

	@ApiOperation({ summary: 'Lists all Argo Workflows' })
	@ApiOkResponse({ type: [WorkflowRunDto], description: 'List of Argo Workflows' })
	@Get()
	async listArgoWorkflows(): Promise<WorkflowRunDto[]> {
		return this.workflowRunsService.listWorkflows();
	}
}
