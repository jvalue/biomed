import { Controller, Get, Logger, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { CurserBasedPaginationResponseDto } from '../pagination/dto/curser-based-pagination-response.dto';
import { WorkflowRunDto } from './dto/workflow-run.dto';
import { WorkflowRunFilterDto } from './dto/workflow-run-filter.dto';
import { WorkflowRunsService } from './workflow-runs.service';

@Controller('workflow-runs')
export class WorkflowRunsController {
	private readonly logger = new Logger(WorkflowRunsController.name);

	constructor(private readonly workflowRunsService: WorkflowRunsService) {}

	@ApiOperation({ summary: 'Lists all Argo Workflows' })
	@ApiOkResponse({ type: [WorkflowRunDto], description: 'List of Argo Workflows' })
	@Get()
	async listArgoWorkflows(
		@Query() filterParams?: WorkflowRunFilterDto,
	): Promise<CurserBasedPaginationResponseDto<WorkflowRunDto>> {
		return this.workflowRunsService.listWorkflows(filterParams);
	}
}
