import { UseQueryResult, useQuery } from '@tanstack/react-query';
import { CrawlerRunDto, CrawlerRunPhaseEnum } from '@/src/app/api/dto/crawler-runs/crawler-run.dto';
import { isRetryableError } from '@/src/app/api/hooks/hook-utils';
import { crawlerRunService } from '@/src/app/api/services/crawler-run.service';

const activePhases = [CrawlerRunPhaseEnum.RUNNING, CrawlerRunPhaseEnum.PENDING];

/**
 * Hook to fetch a crawler run by run ID and namespace.
 * @param runId
 * @param runNamespace
 */
export const useCrawlerRun = (
	runId: string,
	runNamespace: string,
): UseQueryResult<CrawlerRunDto> => {
	return useQuery({
		queryKey: ['crawlerRun', runId],
		queryFn: () => crawlerRunService.getCrawlerRun(runId, runNamespace),
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
			return activePhases.includes(data.phase) ? 5000 : false;
		},
	});
};
