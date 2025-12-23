import { Injectable } from '@nestjs/common';
import { ArgoClientService } from '../argo-client/argo-client.service';
import { WorkflowRunDto } from '../workflow-runs/dto/workflow-run.dto';
import { WorkflowRunParameterDto } from '../workflow-runs/dto/workflow-run-parameter.dto';
import { WorkflowTemplateDto } from './dto/workflow-template.dto';
import { WorkflowTemplatesFilterDto } from './dto/workflow-templates-filter.dto';

@Injectable()
export class WorkflowTemplatesService {
	constructor(private readonly argoClientService: ArgoClientService) {}

	/**
	 * Lists all Argo Workflow Templates.
	 * @param filter Optional filtering options
	 */
	async listWorkflowTemplates(filter?: WorkflowTemplatesFilterDto): Promise<WorkflowTemplateDto[]> {
		const templates = await this.argoClientService.listWorkflowTemplates(filter);
		// Sort by date created descending
		return templates.sort((a: WorkflowTemplateDto, b: WorkflowTemplateDto) => {
			return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
		});
	}

	/**
	 * Submits a new Workflow Run from a Workflow Template.
	 * @param templateName
	 * @param namespace
	 * @param parameters
	 */
	async submitWorkflowTemplateRun(
		templateName: string,
		namespace: string,
		parameters?: WorkflowRunParameterDto[],
	): Promise<WorkflowRunDto> {
		return this.argoClientService.submitWorkflowFromTemplate(templateName, namespace, parameters);
	}
}
