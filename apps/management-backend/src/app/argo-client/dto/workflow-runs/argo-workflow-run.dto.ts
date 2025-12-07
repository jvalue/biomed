import { Expose, Type } from 'class-transformer';
import { ArgoWorkflowRunMetadataDto } from './argo-workflow-run-metadata.dto';
import { ArgoWorkflowRunSpecDto } from './argo-workflow-run-spec.dto';
import { ArgoWorkflowRunStatusDto } from './argo-workflow-run-status.dto';

export class ArgoWorkflowRunDto {
	@Expose()
	@Type(() => ArgoWorkflowRunMetadataDto)
	metadata!: ArgoWorkflowRunMetadataDto;

	@Expose()
	@Type(() => ArgoWorkflowRunSpecDto)
	spec!: ArgoWorkflowRunSpecDto;

	@Expose()
	@Type(() => ArgoWorkflowRunStatusDto)
	status!: ArgoWorkflowRunStatusDto;
}
