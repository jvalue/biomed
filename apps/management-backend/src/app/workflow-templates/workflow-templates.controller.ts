import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiForbiddenResponse, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserEntity } from '../users/entity/user.entity';
import { WorkflowTemplateDto } from './dto/workflow-template.dto';
import { WorkflowTemplatesFilterDto } from './dto/workflow-templates-filter.dto';
import { WorkflowTemplatesService } from './workflow-templates.service';

@Controller('workflow-templates')
@UseGuards(JwtAuthGuard)
export class WorkflowTemplatesController {
	constructor(private readonly workflowTemplatesService: WorkflowTemplatesService) {}

	@ApiOperation({ summary: 'Lists all Argo Workflow Templates' })
	@ApiOkResponse({ type: [WorkflowTemplateDto], description: 'List of Argo Workflow Templates' })
	@ApiForbiddenResponse({ description: 'You do not have permission to access workflow templates' })
	@UseGuards(JwtAuthGuard)
	@Get()
	async listArgoWorkflowTemplates(
		@CurrentUser() requestingUser: UserEntity,
		@Query() filterParams?: WorkflowTemplatesFilterDto,
	): Promise<WorkflowTemplateDto[]> {
		return this.workflowTemplatesService.listWorkflowTemplates(requestingUser, filterParams);
	}
}
