import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiForbiddenResponse, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurserBasedPaginationResponseDto } from '../pagination/dto/curser-based-pagination-response.dto';
import { CurserBasedPaginationRequestDto } from '../pagination/dto/cursor-based-pagination-request.dto';
import { UserEntity } from '../users/entity/user.entity';
import { WorkflowRunDto } from './dto/workflow-run.dto';
import { WorkflowRunFilterDto } from './dto/workflow-run-filter.dto';
import { WorkflowRunsService } from './workflow-runs.service';

@Controller('workflow-runs')
@UseGuards(JwtAuthGuard)
export class WorkflowRunsController {
	constructor(private readonly workflowRunsService: WorkflowRunsService) {}

	@ApiOperation({ summary: 'Lists all Argo Workflows' })
	@ApiOkResponse({ type: [WorkflowRunDto], description: 'List of Argo Workflows' })
	@ApiForbiddenResponse({ description: 'You do not have permission to access workflow runs' })
	@Get()
	async listArgoWorkflows(
		@CurrentUser() requestingUser: UserEntity,
		@Query() filterParams?: WorkflowRunFilterDto,
		@Query() paginationParams?: CurserBasedPaginationRequestDto,
	): Promise<CurserBasedPaginationResponseDto<WorkflowRunDto>> {
		return this.workflowRunsService.listWorkflows(requestingUser, filterParams, paginationParams);
	}
}
