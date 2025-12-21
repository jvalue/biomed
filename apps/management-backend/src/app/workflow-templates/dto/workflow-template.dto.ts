import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsDate, IsOptional, IsString } from 'class-validator';

class WorkflowTemplateParameterDto {
	@ApiProperty({ type: String, description: 'The name of the parameter' })
	@IsString()
	name!: string;

	@ApiProperty({ type: String, description: 'The default value of the parameter', required: false })
	@IsString()
	@IsOptional()
	defaultValue?: string;
}

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

	@ApiProperty({
		type: [WorkflowTemplateParameterDto],
		description: 'The parameters defined for the workflow template',
	})
	@IsArray()
	parameters: WorkflowTemplateParameterDto[];
}
