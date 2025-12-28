import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsDate, IsNumber, IsString } from 'class-validator';

export class ScheduleParameterDto {
	@ApiProperty({
		type: String,
		description: 'The name of the parameter which the schedule passes to the workflow template',
	})
	@IsString()
	name!: string;

	@ApiProperty({
		type: String,
		description: 'The value of the parameter which the schedule passes to the workflow template',
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
		description: 'The name of the workflow template which the schedule triggers',
	})
	@IsString()
	workflowTemplateName!: string;

	@ApiProperty({ type: String, description: 'The Kubernetes Namespace, the schedule belongs to' })
	@IsString()
	namespace!: string;

	@ApiProperty({
		type: [ScheduleParameterDto],
		description: 'The parameters which the schedule passes to the workflow template',
	})
	@IsArray()
	parameters!: ScheduleParameterDto[];

	@ApiProperty({ type: String, description: 'The cron schedule expression' })
	@IsString()
	schedule!: string;

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
}
