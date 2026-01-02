import { ApiProperty } from '@nestjs/swagger';
import {
	Equals,
	IsArray,
	IsNotEmpty,
	IsOptional,
	IsString,
	Matches,
	Validate,
} from 'class-validator';
import { IsCronExpression } from '../infrastructure/argo/cron.validator';
import { ScheduleParameterDto } from './schedule.dto';

export class CreateScheduleDto {
	@ApiProperty({ description: 'Name of the schedule' })
	@IsString()
	@IsNotEmpty()
	@Matches(/^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$/, {
		message:
			"Invalid name format. Must consist of lower case alphanumeric characters, '-' or '.', and must start and end with an alphanumeric character.",
	})
	name!: string;

	@ApiProperty({ description: 'Cron expression defining the schedule' })
	@IsString()
	@IsNotEmpty()
	@Validate(IsCronExpression)
	cronExpression!: string;

	@ApiProperty({ description: 'Namespace of the crawler template to be executed' })
	@IsString()
	@IsNotEmpty()
	@Equals('argo-managed-crawler', { message: 'Namespace has to be argo-managed-crawler' })
	crawlerTemplateNamespace!: string;

	@ApiProperty({ description: 'Name of the crawler template to be executed' })
	@IsString()
	@IsNotEmpty()
	crawlerTemplateName!: string;

	@ApiProperty({
		type: [ScheduleParameterDto],
		description: 'The parameters which the schedule passes to the crawler template',
	})
	@IsArray()
	@IsOptional()
	parameters?: ScheduleParameterDto[];

	@ApiProperty({ description: 'Number of retries in case of failure' })
	@IsOptional()
	retries?: number;
}
