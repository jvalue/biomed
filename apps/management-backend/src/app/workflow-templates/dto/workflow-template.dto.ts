import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsString } from 'class-validator';

export class WorkflowTemplateDto {
	@ApiProperty({ type: String, description: 'The name/id of the workflow template' })
	@IsString()
	name!: string;

	@ApiProperty({
		type: String,
		description: 'The Kubernetes Namespace, the workflow template belongs to',
	})
	@IsString()
	namespace!: string;

	@ApiProperty({
		type: String,
		format: 'date-time',
		description: 'The time when the workflow template was created',
	})
	@Type(() => Date)
	@IsDate()
	createdAt!: Date;
}
