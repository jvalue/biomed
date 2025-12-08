import { Controller, Get, Logger } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { WorkflowRunDto } from './dto/workflow-run.dto';
import { WorkflowRunsService } from './workflow-runs.service';

@Controller('workflow-runs')
export class WorkflowRunsController {
	private readonly logger = new Logger(WorkflowRunsController.name);

	constructor(private readonly workflowRunsService: WorkflowRunsService) {}

	@ApiOperation({ summary: 'Lists all Argo Workflows' })
	@ApiOkResponse({ type: [WorkflowRunDto], description: 'List of Argo Workflows' })
	@Get()
	async listArgoWorkflows(): Promise<WorkflowRunDto[]> {
		return this.workflowRunsService.listWorkflows();
	}
}
