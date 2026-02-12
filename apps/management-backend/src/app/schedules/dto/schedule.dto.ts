import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsDate, IsNumber, IsOptional, IsString } from 'class-validator';
import { ScheduleErrorDetails, ScheduleErrorType } from '../enums/schedule-error-type.enum';
import { RetryStrategyDto } from './retry-strategy.dto';

export class ScheduleParameterDto {
	@ApiProperty({
		type: String,
		description: 'The name of the parameter which the schedule passes to the crawler template',
	})
	@IsString()
	name!: string;

	@ApiProperty({
		type: String,
		description: 'The value of the parameter which the schedule passes to the crawler template',
	})
	@IsString()
	value!: string;
}

class ScheduleStatisticsDto {
	@ApiProperty({
		type: Number,
		description: 'The number of successful runs triggered by the schedule',
	})
	@IsNumber()
	successfulRuns!: number;

	@ApiProperty({
		type: Number,
		description: 'The number of failed runs triggered by the schedule',
	})
	@IsNumber()
	failedRuns!: number;
}

export class ScheduleDto {
	@ApiProperty({ type: String, description: 'The name of the schedule' })
	@IsString()
	name!: string;

	@ApiProperty({
		type: String,
		description: 'The name of the crawler template which the schedule triggers',
	})
	@IsString()
	crawlerTemplateName!: string;

	@ApiProperty({ type: String, description: 'The Kubernetes Namespace, the schedule belongs to' })
	@IsString()
	namespace!: string;

	@ApiProperty({
		type: [ScheduleParameterDto],
		description: 'The parameters which the schedule passes to the crawler template',
	})
	@IsArray()
	parameters!: ScheduleParameterDto[];

	@ApiProperty({ type: String, description: 'The cron schedule expression' })
	@IsString()
	schedule!: string;

	@ApiProperty({
		type: RetryStrategyDto,
		description: 'The retry strategy for failed runs triggered by the schedule',
		nullable: true,
	})
	@IsOptional()
	@Type(() => RetryStrategyDto)
	retryStrategy?: RetryStrategyDto;

	@ApiProperty({ type: Boolean, description: 'Indicates whether the schedule is suspended' })
	@IsBoolean()
	suspended!: boolean;

	@ApiProperty({
		type: String,
		format: 'date-time',
		description: 'The time when the schedule was created',
	})
	@IsDate()
	createdAt!: Date;

	@ApiProperty({
		type: ScheduleStatisticsDto,
		description: 'Statistics about the schedule',
	})
	@Type(() => ScheduleStatisticsDto)
	statistics!: ScheduleStatisticsDto;

	@ApiProperty({
		type: 'object',
		additionalProperties: {
			type: 'object',
			properties: {
				details: { type: 'string', description: 'Details about the error' },
				detectedAt: {
					type: 'string',
					format: 'date-time',
					description: 'The time when the error was detected',
				},
			},
		},
		description: 'Active errors associated with the schedule, keyed by error type',
	})
	@IsOptional()
	activeErrors?: Record<ScheduleErrorType, ScheduleErrorDetails>;
}
