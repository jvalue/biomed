export class ScheduleParameterDto {
	name!: string;

	value!: string;
}

class ScheduleStatisticsDto {
	successfulRuns!: number;

	failedRuns!: number;
}

class RetryStrategyDto {
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
}
