import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class WorkflowRunParameterDto {
	@ApiProperty({ type: String, description: 'The name of the workflow run parameter' })
	@IsString()
	name!: string;

	@ApiProperty({ type: String, description: 'The value of the workflow run parameter' })
	@IsString()
	value!: string;
}
