import { Expose, Type } from 'class-transformer';
import { ArgoWorkflowRunSpecWorkflowTemplateDto } from './argo-workflow-run-spec-workflow-template.dto';

export class ArgoWorkflowRunSpecDto {
	@Expose()
	@Type(() => ArgoWorkflowRunSpecWorkflowTemplateDto)
	workflowTemplateRef!: ArgoWorkflowRunSpecWorkflowTemplateDto;
}
