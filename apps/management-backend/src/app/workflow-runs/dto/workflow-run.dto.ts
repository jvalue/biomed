import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsString } from 'class-validator';

export class WorkflowRunDto {
	@ApiProperty({ description: 'The name/id of the workflow run' })
	@IsString()
	name!: string;

	@ApiProperty({ description: 'The Kubernetes Namespace, the workflow is running in' })
	@IsString()
	namespace!: string;

	@ApiProperty({
		description: 'The name of the workflow template used to create this workflow run',
	})
	@IsString()
	workflowTemplateName!: string;

	@ApiProperty({ description: 'The current phase/status of the workflow run' })
	@IsString()
	phase!: string;

	@ApiProperty({ description: 'The time when the workflow run started' })
	@IsDate()
	startedAt?: Date;

	@ApiProperty({ description: 'The time when the workflow run finished' })
	@IsDate()
	finishedAt?: Date;
}
