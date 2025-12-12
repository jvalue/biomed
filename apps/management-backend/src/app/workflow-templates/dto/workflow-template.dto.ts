import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsOptional, IsString } from 'class-validator';

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
		required: false,
		description: 'The time when the workflow template was created',
	})
	@IsOptional()
	@Type(() => Date)
	@IsDate()
	createdAt?: Date;
}
