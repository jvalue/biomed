import { UseQueryResult, useQuery } from '@tanstack/react-query';
import { CursorBasedPaginationResponseDto } from '@/src/app/api/dto/pagination/cursor-based-pagination-response.dto';
import { CrawlerRunDto } from '@/src/app/api/dto/workflow/crawler-run.dto';
import { crawlerRunService } from '../services/crawler-run-service';

export const useCrawlerRuns = (
	scheduleName?: string,
): UseQueryResult<CursorBasedPaginationResponseDto<CrawlerRunDto>> => {
	return useQuery({
		queryKey: ['workflowRuns', scheduleName],
		queryFn: () => crawlerRunService.getWorkflowRuns(scheduleName),
		refetchInterval: 5000, // Auto-refresh
	});
};
