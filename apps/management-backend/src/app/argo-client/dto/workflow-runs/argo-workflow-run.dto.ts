import { Type } from 'class-transformer';
import { IsDate, IsString } from 'class-validator';

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
	'workflows.argoproj.io/workflow-template'!: string;
}

class ArgoWorkflowRunStatusDto {
	// TODO: possibly change to enum
	@IsString()
	phase!: string;

	@IsDate()
	startedAt?: Date;

	@IsDate()
	finishedAt?: Date;
}
