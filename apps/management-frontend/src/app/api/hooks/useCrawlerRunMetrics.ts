import { UseQueryResult, useQuery } from '@tanstack/react-query';
import { CrawlerRunPhaseEnum } from '@/src/app/api/dto/crawler-runs/crawler-run.dto';
import { CrawlerRunEventDto } from '@/src/app/api/dto/crawler-runs/metrics/crawler-run-event.dto';
import { CrawlerRunMetricDto } from '@/src/app/api/dto/crawler-runs/metrics/crawler-run-metric.dto';
import { isRetryableError } from '@/src/app/api/hooks/hook-utils';
import { metricsService } from '@/src/app/api/services/metrics.service';

const activePhases = [CrawlerRunPhaseEnum.RUNNING, CrawlerRunPhaseEnum.PENDING];

/**
 * Hook to fetch crawler run metrics by run ID and namespace.
 * @param runId
 * @param runNamespace
 * @param runPhase The current phase of the run (used to decide automatic refresh)
 */
export const useCrawlerRunMetrics = (
	runId: string,
	runNamespace: string,
	runPhase?: CrawlerRunPhaseEnum,
): UseQueryResult<CrawlerRunMetricDto> => {
	// Only refresh automatically while the run is active

	return useQuery<CrawlerRunMetricDto>({
		queryKey: ['crawlerRunMetrics', runId, runNamespace],
		queryFn: () => metricsService.getCrawlerRunMetrics(runId, runNamespace),
		refetchInterval: (query) => {
			if (query.state.error) {
				if (isRetryableError(query.state.error)) {
					return 60000; // Retry every minute on retryable errors
				} else {
					return false; // Do not retry on non-retryable errors
				}
			}
			const data = query.state.data;
			if (!data) return false;
			return runPhase && activePhases.includes(runPhase) ? 5000 : false;
		},
		// Handled by the refetchInterval logic
		retry: false,
	});
};

/**
 * Hook to fetch crawler run events by run ID and namespace.
 * @param runId
 * @param runNamespace
 * @param runPhase The current phase of the run (used to decide automatic refresh)
 */
export const useCrawlerRunEvents = (
	runId: string,
	runNamespace: string,
	runPhase?: CrawlerRunPhaseEnum,
): UseQueryResult<CrawlerRunEventDto[]> => {
	// Only refresh automatically while the run is active
	return useQuery({
		queryKey: ['crawlerRunEvents', runId, runNamespace],
		queryFn: () => metricsService.getCrawlerRunEvents(runId, runNamespace),
		refetchInterval: (query) => {
			if (query.state.error) {
				if (isRetryableError(query.state.error)) {
					return 60000; // Retry every minute on retryable errors
				} else {
					return false; // Do not retry on non-retryable errors
				}
			}
			const data = query.state.data;
			if (!data) return false;
			return runPhase && activePhases.includes(runPhase) ? 5000 : false;
		},
		// Handled by the refetchInterval logic
		retry: false,
	});
};
