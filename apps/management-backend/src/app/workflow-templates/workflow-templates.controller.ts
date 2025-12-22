import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import {
	ApiBody,
	ApiForbiddenResponse,
	ApiOkResponse,
	ApiOperation,
	ApiParam,
} from '@nestjs/swagger';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { WorkflowRunDto } from '../workflow-runs/dto/workflow-run.dto';
import { WorkflowRunParameterDto } from '../workflow-runs/dto/workflow-run-parameter.dto';
import { WorkflowTemplateDto } from './dto/workflow-template.dto';
import { WorkflowTemplatesFilterDto } from './dto/workflow-templates-filter.dto';
import { WorkflowTemplatesService } from './workflow-templates.service';

@Controller('workflow-templates')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class WorkflowTemplatesController {
	constructor(private readonly workflowTemplatesService: WorkflowTemplatesService) {}

	@ApiOperation({ summary: 'Lists all Argo Workflow Templates' })
	@ApiOkResponse({ type: [WorkflowTemplateDto], description: 'List of Argo Workflow Templates' })
	@ApiForbiddenResponse({ description: 'You do not have permission to access workflow templates' })
	@RequirePermission('read', 'template')
	@Get()
	async listArgoWorkflowTemplates(
		@Query() filterParams?: WorkflowTemplatesFilterDto,
	): Promise<WorkflowTemplateDto[]> {
		return this.workflowTemplatesService.listWorkflowTemplates(filterParams);
	}

	@ApiOperation({ summary: 'Submit a run for a given Workflow Template' })
	@ApiOkResponse({ type: WorkflowRunDto, description: 'The submitted Workflow Run' })
	@ApiForbiddenResponse({ description: 'You do not have permission to submit workflow runs' })
	@ApiParam({
		name: 'namespace',
		type: String,
		description: 'The Kubernetes Namespace where the Workflow Template is located',
	})
	@ApiParam({
		name: 'templateName',
		type: String,
		description: 'The name of the Workflow Template',
	})
	@ApiBody({
		type: [WorkflowRunParameterDto],
		description: 'Optional parameters to pass to the Workflow Template',
	})
	@RequirePermission('create', 'workflow')
	@Post(':namespace/:templateName/submit')
	async submitWorkflowTemplateRun(
		@Param('namespace') namespace: string,
		@Param('templateName') templateName: string,
		@Body() parameters?: WorkflowRunParameterDto[],
	): Promise<WorkflowRunDto> {
		return this.workflowTemplatesService.submitWorkflowTemplateRun(
			templateName,
			namespace,
			parameters,
		);
	}
}
