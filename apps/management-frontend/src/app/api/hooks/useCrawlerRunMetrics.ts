import { UseQueryResult, useQuery } from '@tanstack/react-query';
import { CrawlerRunEventDto } from '@/src/app/api/dto/crawler-runs/metrics/crawler-run-event.dto';
import { CrawlerRunMetricDto } from '@/src/app/api/dto/crawler-runs/metrics/crawler-run-metric.dto';
import { metricsService } from '@/src/app/api/services/metrics.service';

/**
 * Hook to fetch crawler run metrics by run ID and namespace.
 * @param runId
 * @param runNamespace
 */
export const useCrawlerRunMetrics = (
	runId: string,
	runNamespace: string,
): UseQueryResult<CrawlerRunMetricDto> => {
	return useQuery({
		queryKey: ['crawlerRunMetrics', runId],
		queryFn: () => metricsService.getCrawlerRunMetrics(runId, runNamespace),
		refetchInterval: 5000, // Auto-refresh
	});
};

/**
 * Hook to fetch crawler run events by run ID and namespace.
 * @param runId
 * @param runNamespace
 */
export const useCrawlerRunEvents = (
	runId: string,
	runNamespace: string,
): UseQueryResult<CrawlerRunEventDto[]> => {
	return useQuery({
		queryKey: ['crawlerRunEvents', runId],
		queryFn: () => metricsService.getCrawlerRunEvents(runId, runNamespace),
		refetchInterval: 5000, // Auto-refresh
	});
};
