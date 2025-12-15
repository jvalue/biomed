import { Expose, Type } from 'class-transformer';
import { IsDate, IsString } from 'class-validator';
import { WorkflowPhaseEnum } from '../../enums/workflow-phase.enum';

export class ArgoWorkflowRunDto {
	@Type(() => ArgoWorkflowRunMetadataDto)
	metadata!: ArgoWorkflowRunMetadataDto;

	@Type(() => ArgoWorkflowRunStatusDto)
	status!: ArgoWorkflowRunStatusDto;
}

class ArgoWorkflowRunMetadataDto {
	@IsString()
	name!: string;

	@IsString()
	namespace!: string;

	@Type(() => ArgoWorkflowRunMetadataLabelsDto)
	labels!: ArgoWorkflowRunMetadataLabelsDto;
}

class ArgoWorkflowRunMetadataLabelsDto {
	@IsString()
	@Expose({ name: 'workflows.argoproj.io/workflow-template' })
	workflowTemplate!: string;
}

class ArgoWorkflowRunStatusDto {
	@IsString()
	phase!: WorkflowPhaseEnum;

	@IsDate()
	startedAt?: Date;

	@IsDate()
	finishedAt?: Date;
}
