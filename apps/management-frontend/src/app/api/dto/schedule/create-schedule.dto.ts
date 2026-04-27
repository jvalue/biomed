import { ParameterDto } from '@/src/app/api/dto/crawler-runs/parameter.dto';
import { RetryStrategyDto } from './schedule.dto';

export class CreateScheduleDto {
	name!: string;

	cronExpression!: string;

	timezone!: string;

	crawlerTemplateNamespace!: string;

	crawlerTemplateName!: string;

	parameters?: ParameterDto[];

	retryStrategy?: RetryStrategyDto;
}
