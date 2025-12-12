import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class WorkflowTemplatesFilterDto {
	@ApiProperty({ type: String, required: false, description: 'Kubernetes Namespace' })
	@IsOptional()
	@IsString()
	namespace?: string;

	@ApiProperty({
		type: String,
		required: false,
		description: 'Workflow template name search string',
	})
	@IsOptional()
	@IsString()
	nameSearchString?: string;
}
