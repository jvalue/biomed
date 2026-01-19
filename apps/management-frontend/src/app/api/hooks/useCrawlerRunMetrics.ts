import { UseQueryResult, useQuery } from '@tanstack/react-query';
import { CrawlerRunPhaseEnum } from '@/src/app/api/dto/crawler-runs/crawler-run.dto';
import { CrawlerRunEventDto } from '@/src/app/api/dto/crawler-runs/metrics/crawler-run-event.dto';
import { CrawlerRunMetricDto } from '@/src/app/api/dto/crawler-runs/metrics/crawler-run-metric.dto';
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
	const refetchInterval = runPhase && activePhases.includes(runPhase) ? 5000 : false;

	return useQuery<CrawlerRunMetricDto>({
		queryKey: ['crawlerRunMetrics', runId, runNamespace],
		queryFn: () => metricsService.getCrawlerRunMetrics(runId, runNamespace),
		refetchInterval,
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
	const refetchInterval = runPhase && activePhases.includes(runPhase) ? 5000 : false;
	return useQuery({
		queryKey: ['crawlerRunEvents', runId, runNamespace],
		queryFn: () => metricsService.getCrawlerRunEvents(runId, runNamespace),
		refetchInterval,
	});
};
