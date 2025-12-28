import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ScheduleParameterDto } from './schedule.dto';

export class CreateScheduleDto {
	@ApiProperty({ description: 'Name of the schedule' })
	@IsString()
	@IsNotEmpty()
	name!: string;

	@ApiProperty({ description: 'Cron expression defining the schedule' })
	@IsString()
	@IsNotEmpty()
	cronExpression!: string;

	@ApiProperty({ description: 'Namespace of the workflow template to be executed' })
	@IsString()
	@IsNotEmpty()
	workflowTemplateNamespace!: string;

	@ApiProperty({ description: 'Name of the workflow template to be executed' })
	@IsString()
	@IsNotEmpty()
	workflowTemplateName!: string;

	@ApiProperty({
		type: [ScheduleParameterDto],
		description: 'The parameters which the schedule passes to the workflow template',
	})
	@IsArray()
	@IsOptional()
	parameters?: ScheduleParameterDto[];
}
