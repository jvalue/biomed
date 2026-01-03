import { UseQueryResult, useQuery } from '@tanstack/react-query';
import { CrawlerRunDto } from '@/src/app/api/dto/crawler-runs/crawler-run.dto';
import { CursorBasedPaginationResponseDto } from '@/src/app/api/dto/pagination/cursor-based-pagination-response.dto';
import { crawlerRunService } from '../services/crawler-run-service';

export const useCrawlerRuns = (params?: {
	scheduleName?: string;
	limit?: number;
	offset?: number;
}): UseQueryResult<CursorBasedPaginationResponseDto<CrawlerRunDto>> => {
	return useQuery({
		queryKey: ['crawlerRuns', params?.scheduleName, params?.limit ?? null, params?.offset ?? null],
		queryFn: () => crawlerRunService.getCrawlerRuns(params),
		refetchInterval: 5000, // Auto-refresh
	});
};
