import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsOptional, IsString } from 'class-validator';
import { WorkflowPhaseEnum } from '../../argo-client/enums/workflow-phase.enum';

export class WorkflowRunDto {
	@ApiProperty({ type: String, description: 'The name/id of the workflow run' })
	@IsString()
	name!: string;

	@ApiProperty({
		type: String,
		description: 'The Kubernetes Namespace, the workflow is running in',
	})
	@IsString()
	namespace!: string;

	@ApiProperty({
		type: String,
		description: 'The name of the workflow template used to create this workflow run',
	})
	@IsString()
	workflowTemplateName!: string;

	@ApiProperty({
		type: String,
		required: false,
		description: 'The name of the schedule that triggered this workflow run, if applicable',
	})
	@IsOptional()
	@IsString()
	scheduleName?: string;

	@ApiProperty({
		enum: WorkflowPhaseEnum,
		enumName: 'WorkflowPhaseEnum',
		description: 'The current phase/status of the workflow run',
	})
	@IsEnum(WorkflowPhaseEnum)
	phase!: WorkflowPhaseEnum;

	@ApiProperty({
		type: String,
		format: 'date-time',
		required: false,
		description: 'The time when the workflow run was started',
	})
	@IsOptional()
	@Type(() => Date)
	@IsDate()
	startedAt?: Date;

	@ApiProperty({
		type: String,
		format: 'date-time',
		required: false,
		description: 'The time when the workflow run finished',
	})
	@IsOptional()
	@Type(() => Date)
	@IsDate()
	finishedAt?: Date;
}
