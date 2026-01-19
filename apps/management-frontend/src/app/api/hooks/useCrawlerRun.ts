import { UseQueryResult, useQuery } from '@tanstack/react-query';
import { CrawlerRunDto, CrawlerRunPhaseEnum } from '@/src/app/api/dto/crawler-runs/crawler-run.dto';
import { crawlerRunService } from '@/src/app/api/services/crawler-run.service';

const activePhases = [CrawlerRunPhaseEnum.RUNNING, CrawlerRunPhaseEnum.PENDING];

/**
 * Hook to fetch a crawler run by run ID and namespace.
 * @param runId
 * @param runNamespace
 * @param runPhase The current phase of the run (used to decide automatic refresh)
 */
export const useCrawlerRun = (
	runId: string,
	runNamespace: string,
	runPhase?: CrawlerRunPhaseEnum,
): UseQueryResult<CrawlerRunDto> => {
	const refetchInterval = runPhase && activePhases.includes(runPhase) ? 5000 : false;

	return useQuery({
		queryKey: ['crawlerRun', runId],
		queryFn: () => crawlerRunService.getCrawlerRun(runId, runNamespace),
		refetchInterval, // Auto-refresh
	});
};
