import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsDate, IsString } from 'class-validator';

export class WorkflowRunDto {
	@Expose()
	@ApiProperty({ description: 'The name/id of the workflow run' })
	@IsString()
	name!: string;

	@Expose()
	@ApiProperty({ description: 'The Kubernetes Namespace, the workflow is running in' })
	@IsString()
	namespace!: string;

	@Expose()
	@ApiProperty({
		description: 'The name of the workflow template used to create this workflow run',
	})
	@IsString()
	workflowTemplateName?: string;

	@Expose()
	@ApiProperty({ description: 'The current phase/status of the workflow run' })
	@IsString()
	phase!: string;

	@Expose()
	@ApiProperty({ description: 'The time when the workflow run started' })
	@IsDate()
	startedAt?: Date;

	@Expose()
	@ApiProperty({ description: 'The time when the workflow run finished' })
	@IsDate()
	finishedAt?: Date;
}
