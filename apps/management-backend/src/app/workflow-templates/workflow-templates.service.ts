import { Injectable } from '@nestjs/common';
import { ArgoClientService } from '../argo-client/argo-client.service';
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
}
