import { UseQueryResult, useQuery } from '@tanstack/react-query';
import { CrawlerRunDto } from '@/src/app/api/dto/crawler-runs/crawler-run.dto';
import { CursorBasedPaginationResponseDto } from '@/src/app/api/dto/pagination/cursor-based-pagination-response.dto';
import { crawlerRunService } from '../services/crawler-run-service';

export const useCrawlerRuns = (
	scheduleName?: string,
): UseQueryResult<CursorBasedPaginationResponseDto<CrawlerRunDto>> => {
	return useQuery({
		queryKey: ['crawlerRuns', scheduleName],
		queryFn: () => crawlerRunService.getCrawlerRuns(scheduleName),
		refetchInterval: 5000, // Auto-refresh
	});
};
