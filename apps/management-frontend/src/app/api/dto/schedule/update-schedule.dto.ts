import { ParameterDto } from '@/src/app/api/dto/crawler-runs/parameter.dto';
import { RetryStrategyDto } from './schedule.dto';

export interface UpdateScheduleDto {
	cronExpression?: string;
	retryStrategy?: RetryStrategyDto;
	parameters?: ParameterDto[];
}
