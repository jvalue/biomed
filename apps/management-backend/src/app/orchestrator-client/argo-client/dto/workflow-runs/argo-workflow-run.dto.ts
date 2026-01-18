import { Expose, Type } from 'class-transformer';
import { IsDate, IsEnum, IsOptional, IsString } from 'class-validator';
import { WorkflowPhaseEnum } from '../../enums/workflow-phase.enum';
import { ArgoParameterDto } from '../argo-parameter.dto';

class ArgoWorkflowRunSpecArgumentsDto {
	@IsOptional()
	@Type(() => ArgoParameterDto)
	parameters?: ArgoParameterDto[];
}

class ArgoWorkflowRunSpecDto {
	@Type(() => ArgoWorkflowRunSpecArgumentsDto)
	@IsOptional()
	arguments?: ArgoWorkflowRunSpecArgumentsDto;
}

export class ArgoWorkflowRunDto {
	@Type(() => ArgoWorkflowRunMetadataDto)
	metadata!: ArgoWorkflowRunMetadataDto;

	@Type(() => ArgoWorkflowRunStatusDto)
	status!: ArgoWorkflowRunStatusDto;

	@Type(() => ArgoWorkflowRunSpecDto)
	spec!: ArgoWorkflowRunSpecDto;
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
	@Expose({ name: 'workflows.argoproj.io/cron-workflow' })
	@IsOptional()
	cronWorkflow?: string;

	// Custom label to link workflow runs to workflow templates for scheduled runs
	@IsString()
	@IsOptional()
	customSetWorkflowTemplateName?: string;
}

class ArgoWorkflowRunStatusDto {
	@IsEnum(WorkflowPhaseEnum)
	phase!: WorkflowPhaseEnum;

	@IsDate()
	startedAt?: Date;

	@IsDate()
	finishedAt?: Date;
}
