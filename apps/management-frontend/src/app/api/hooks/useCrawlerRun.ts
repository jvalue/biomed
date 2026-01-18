import { UseQueryResult, useQuery } from '@tanstack/react-query';
import { CrawlerRunDto } from '@/src/app/api/dto/crawler-runs/crawler-run.dto';
import { crawlerRunService } from '@/src/app/api/services/crawler-run.service';

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
		refetchInterval: 5000, // Auto-refresh
	});
};
