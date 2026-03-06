import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
	IsArray,
	IsNotEmpty,
	IsOptional,
	IsString,
	Matches,
	Validate,
	ValidateNested,
} from 'class-validator';
import { IsCronExpression } from '../infrastructure/argo/cron.validator';
import { RetryStrategyDto } from './retry-strategy.dto';
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

	@ApiProperty({ description: 'Retry strategy in case of workflow failure', required: false })
	@IsOptional()
	@ValidateNested()
	@Type(() => RetryStrategyDto)
	retryStrategy?: RetryStrategyDto;
}
