import {
	ScheduleErrorDetails,
	ScheduleErrorType,
} from '@/src/app/api/dto/schedule/schedule-error-type.enum';

export class ScheduleParameterDto {
	name!: string;

	value!: string;
}

class ScheduleStatisticsDto {
	successfulRuns!: number;

	failedRuns!: number;
}

export class RetryStrategyDto {
	retries!: number;

	backoffDuration?: number;

	backoffFactor?: number;

	backoffCap?: number;

	backoffMaxDuration?: number;
}

export class ScheduleDto {
	name!: string;

	crawlerTemplateName!: string;

	namespace!: string;

	parameters!: ScheduleParameterDto[];

	schedule!: string;

	retryStrategy?: RetryStrategyDto;

	suspended!: boolean;

	createdAt!: Date;

	statistics!: ScheduleStatisticsDto;

	// Optional field to represent any active errors associated with the schedule
	activeErrors?: Record<ScheduleErrorType, ScheduleErrorDetails>;
}
