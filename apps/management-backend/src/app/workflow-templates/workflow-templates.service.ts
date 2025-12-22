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
		return this.argoClientService.listWorkflowTemplates(filter);
	}

	/*
	 * Submit a run for a given Workflow Template.
	 * @param templateName The name of the Workflow Template
	 * @param namespace The Kubernetes Namespace where the Workflow Template is located
	 * @param parameters Optional parameters to pass to the Workflow Template
	 */
	async submitWorkflowTemplateRun(
		templateName: string,
		namespace: string,
		parameters?: WorkflowRunParameterDto[],
	): Promise<WorkflowRunDto> {
		return this.argoClientService.submitWorkflowFromTemplate(templateName, namespace, parameters);
	}
}
