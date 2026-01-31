import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, Validate } from 'class-validator';
import { IsCronExpression } from '../infrastructure/argo/cron.validator';
import { RetryStrategyDto } from './retry-strategy.dto';
import { ScheduleParameterDto } from './schedule.dto';

export class UpdateScheduleDto {
	@ApiProperty({ description: 'The new cron expression', required: false })
	@IsOptional()
	@IsString()
	@Validate(IsCronExpression)
	cronExpression?: string;

	@ApiProperty({ description: 'The new retry strategy', required: false })
	@IsOptional()
	@Type(() => RetryStrategyDto)
	retryStrategy?: RetryStrategyDto;

	@ApiProperty({ description: 'The new parameters', required: false, type: [ScheduleParameterDto] })
	@IsOptional()
	@Type(() => ScheduleParameterDto)
	parameters?: ScheduleParameterDto[];
}
