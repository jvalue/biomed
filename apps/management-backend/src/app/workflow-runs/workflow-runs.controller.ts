import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurserBasedPaginationResponseDto } from '../pagination/dto/curser-based-pagination-response.dto';
import { CurserBasedPaginationRequestDto } from '../pagination/dto/cursor-based-pagination-request.dto';
import { WorkflowRunDto } from './dto/workflow-run.dto';
import { WorkflowRunFilterDto } from './dto/workflow-run-filter.dto';
import { WorkflowRunsService } from './workflow-runs.service';

@Controller('workflow-runs')
export class WorkflowRunsController {
	constructor(private readonly workflowRunsService: WorkflowRunsService) {}

	@ApiOperation({ summary: 'Lists all Argo Workflows' })
	@ApiOkResponse({ type: [WorkflowRunDto], description: 'List of Argo Workflows' })
	@UseGuards(JwtAuthGuard)
	@Get()
	async listArgoWorkflows(
		@Query() filterParams?: WorkflowRunFilterDto,
		@Query() paginationParams?: CurserBasedPaginationRequestDto,
	): Promise<CurserBasedPaginationResponseDto<WorkflowRunDto>> {
		return this.workflowRunsService.listWorkflows(filterParams, paginationParams);
	}
}
