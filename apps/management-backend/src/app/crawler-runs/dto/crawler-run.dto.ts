import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsOptional, IsString } from 'class-validator';
import { WorkflowPhaseEnum } from '../../argo-client/enums/workflow-phase.enum';

export class CrawlerRunDto {
	@ApiProperty({ type: String, description: 'The name/id of the crawler run' })
	@IsString()
	name!: string;

	@ApiProperty({
		type: String,
		description: 'The Kubernetes Namespace, the crawler is running in',
	})
	@IsString()
	namespace!: string;

	@ApiProperty({
		type: String,
		description: 'The name of the crawler template used to create this crawler run',
	})
	@IsString()
	crawlerTemplateName!: string;

	@ApiProperty({
		type: String,
		required: false,
		description: 'The name of the schedule that triggered this crawler run, if applicable',
	})
	@IsOptional()
	@IsString()
	scheduleName?: string;

	@ApiProperty({
		enum: WorkflowPhaseEnum,
		enumName: 'WorkflowPhaseEnum',
		description: 'The current phase/status of the crawler run',
	})
	@IsEnum(WorkflowPhaseEnum)
	phase!: WorkflowPhaseEnum;

	@ApiProperty({
		type: String,
		format: 'date-time',
		required: false,
		description: 'The time when the crawler run was started',
	})
	@IsOptional()
	@Type(() => Date)
	@IsDate()
	startedAt?: Date;

	@ApiProperty({
		type: String,
		format: 'date-time',
		required: false,
		description: 'The time when the crawler run finished',
	})
	@IsOptional()
	@Type(() => Date)
	@IsDate()
	finishedAt?: Date;
}
