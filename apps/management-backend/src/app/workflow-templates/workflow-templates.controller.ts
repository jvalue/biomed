import { Controller, Get, Logger, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { CurserBasedPaginationResponseDto } from '../pagination/dto/curser-based-pagination-response.dto';
import { CurserBasedPaginationRequestDto } from '../pagination/dto/cursor-based-pagination-request.dto';
import { WorkflowTemplateDto } from './dto/workflow-template.dto';
import { WorkflowTemplatesService } from './workflow-templates.service';

@Controller('workflow-templates')
export class WorkflowTemplatesController {
	private readonly logger = new Logger(WorkflowTemplatesController.name);

	constructor(private readonly workflowTemplatesService: WorkflowTemplatesService) {}

	@ApiOperation({ summary: 'Lists all Argo Workflow Templates' })
	@ApiOkResponse({ type: [WorkflowTemplateDto], description: 'List of Argo Workflow Templates' })
	@Get()
	async listArgoWorkflowTemplates(
		@Query() paginationParams?: CurserBasedPaginationRequestDto,
	): Promise<CurserBasedPaginationResponseDto<WorkflowTemplateDto>> {
		return this.workflowTemplatesService.listWorkflowTemplates(paginationParams);
	}
}
