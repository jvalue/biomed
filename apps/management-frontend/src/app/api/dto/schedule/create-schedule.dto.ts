import { RetryStrategyDto, ScheduleParameterDto } from './schedule.dto';

export class CreateScheduleDto {
	name!: string;

	cronExpression!: string;

	crawlerTemplateNamespace!: string;

	crawlerTemplateName!: string;

	parameters?: ScheduleParameterDto[];

	retryStrategy?: RetryStrategyDto;
}
