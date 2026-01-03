import { ScheduleParameterDto } from './schedule.dto';

class RetryStrategyDto {
	retries!: number;
	backoffDuration?: number;
	backoffFactor?: number;
	backoffCap?: number;
	backoffMaxDuration?: number;
}

export class CreateScheduleDto {
	name!: string;

	cronExpression!: string;

	crawlerTemplateNamespace!: string;

	crawlerTemplateName!: string;

	parameters?: ScheduleParameterDto[];

	retryStrategy?: RetryStrategyDto;
}
