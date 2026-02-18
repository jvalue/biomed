import { UseQueryResult, useQuery } from '@tanstack/react-query';
import { ScheduleHistoricalMetricsItemDto } from '@/src/app/api/dto/schedule/metrics/schedule-historical-metrics-item.dto';
import { ScheduleOverallMetricsDto } from '@/src/app/api/dto/schedule/metrics/schedule-overall-metrics.dto';
import { isRetryableError } from '@/src/app/api/hooks/hook-utils';
import { scheduleService } from '@/src/app/api/services/schedule.service';

export const useScheduleMetricsSummary = (
	name: string,
	namespace: string,
): UseQueryResult<ScheduleOverallMetricsDto> => {
	return useQuery<ScheduleOverallMetricsDto>({
		queryKey: ['scheduleMetrics', namespace, name],
		queryFn: () => scheduleService.getScheduleMetricsSummary(name, namespace),
		refetchInterval: (query) => {
			if (query.state.error) {
				if (isRetryableError(query.state.error)) {
					return 60000; // Retry every minute on retryable errors
				} else {
					return false; // Do not retry on non-retryable errors
				}
			}
			return 60 * 60000; // Refresh every hour
		},
		// Handled by the refetchInterval logic
		retry: false,
	});
};

export const useScheduleHistoricalMetrics = (
	name: string,
	namespace: string,
	fromDate?: Date,
	toDate?: Date,
): UseQueryResult<ScheduleHistoricalMetricsItemDto[]> => {
	return useQuery<ScheduleHistoricalMetricsItemDto[]>({
		queryKey: ['scheduleHistoricalMetrics', namespace, name, fromDate, toDate],
		queryFn: () => scheduleService.getScheduleMetricsHistory(name, namespace, fromDate, toDate),
		refetchInterval: (query) => {
			if (query.state.error) {
				if (isRetryableError(query.state.error)) {
					return 60000; // Retry every minute on retryable errors
				} else {
					return false; // Do not retry on non-retryable errors
				}
			}
			return 60 * 60000; // Refresh every hour
		},
		// Handled by the refetchInterval logic
		retry: false,
	});
};
