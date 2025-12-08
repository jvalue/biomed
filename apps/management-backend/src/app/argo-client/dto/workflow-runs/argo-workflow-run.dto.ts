import { Type } from 'class-transformer';
import { ArgoWorkflowRunMetadataDto } from './argo-workflow-run-metadata.dto';
import { ArgoWorkflowRunSpecDto } from './argo-workflow-run-spec.dto';
import { ArgoWorkflowRunStatusDto } from './argo-workflow-run-status.dto';

export class ArgoWorkflowRunDto {
	@Type(() => ArgoWorkflowRunMetadataDto)
	metadata!: ArgoWorkflowRunMetadataDto;

	@Type(() => ArgoWorkflowRunSpecDto)
	spec!: ArgoWorkflowRunSpecDto;

	@Type(() => ArgoWorkflowRunStatusDto)
	status!: ArgoWorkflowRunStatusDto;
}
